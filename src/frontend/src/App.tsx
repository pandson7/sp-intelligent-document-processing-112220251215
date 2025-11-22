import React, { useState, useCallback } from 'react';
import './App.css';

const API_BASE_URL = 'https://fcvq1e34pf.execute-api.us-east-1.amazonaws.com/prod';

interface Document {
  documentId: string;
  fileName: string;
  status: string;
  uploadTimestamp: string;
  ocrResults?: {
    text: string;
    keyValuePairs: Record<string, string>;
  };
  classification?: {
    category: string;
    confidence: number;
  };
  summary?: string;
  completedTimestamp?: string;
  errorMessage?: string;
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (isValidFileType(file)) {
        setSelectedFile(file);
      } else {
        alert('Please select a valid file type (JPEG, PNG, or PDF)');
      }
    }
  }, []);

  const isValidFileType = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    return validTypes.includes(file.type);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isValidFileType(file)) {
        setSelectedFile(file);
      } else {
        alert('Please select a valid file type (JPEG, PNG, or PDF)');
        e.target.value = '';
      }
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Get presigned URL
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, documentId } = await response.json();

      // Upload file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      alert(`File uploaded successfully! Document ID: ${documentId}`);
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Refresh documents list
      fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchDocumentDetails = async (documentId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}`);
      if (response.ok) {
        const document = await response.json();
        setSelectedDocument(document);
      }
    } catch (error) {
      console.error('Error fetching document details:', error);
    }
  };

  React.useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'uploaded': return '#FF9800';
      case 'ocr-complete': return '#2196F3';
      case 'classified': return '#9C27B0';
      default: return '#757575';
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Intelligent Document Processing</h1>
        <p>Upload documents for OCR, classification, and summarization</p>
      </header>

      <main className="main-content">
        {/* Upload Section */}
        <section className="upload-section">
          <h2>Upload Document</h2>
          <div 
            className={`upload-area ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="upload-content">
              <div className="upload-icon">📄</div>
              <p>Drag and drop your document here, or click to select</p>
              <p className="file-types">Supported formats: JPEG, PNG, PDF</p>
              <input
                id="file-input"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button 
                className="select-file-btn"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                Select File
              </button>
            </div>
          </div>
          
          {selectedFile && (
            <div className="selected-file">
              <p><strong>Selected:</strong> {selectedFile.name}</p>
              <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              <button 
                className="upload-btn"
                onClick={uploadFile}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          )}
        </section>

        {/* Documents List */}
        <section className="documents-section">
          <h2>Documents ({documents.length})</h2>
          <div className="documents-grid">
            {documents.map((doc) => (
              <div 
                key={doc.documentId} 
                className="document-card"
                onClick={() => fetchDocumentDetails(doc.documentId)}
              >
                <div className="document-header">
                  <h3>{doc.fileName}</h3>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(doc.status) }}
                  >
                    {doc.status}
                  </span>
                </div>
                <p className="upload-time">
                  Uploaded: {new Date(doc.uploadTimestamp).toLocaleString()}
                </p>
                {doc.classification && (
                  <p className="classification">
                    Category: {doc.classification.category} 
                    ({Math.round(doc.classification.confidence * 100)}%)
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Document Details Modal */}
        {selectedDocument && (
          <div className="modal-overlay" onClick={() => setSelectedDocument(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedDocument.fileName}</h2>
                <button 
                  className="close-btn"
                  onClick={() => setSelectedDocument(null)}
                >
                  ×
                </button>
              </div>
              
              <div className="modal-body">
                <div className="detail-section">
                  <h3>Status</h3>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(selectedDocument.status) }}
                  >
                    {selectedDocument.status}
                  </span>
                </div>

                {selectedDocument.ocrResults && (
                  <div className="detail-section">
                    <h3>OCR Results</h3>
                    <div className="ocr-results">
                      <h4>Extracted Text:</h4>
                      <div className="text-content">
                        {selectedDocument.ocrResults.text}
                      </div>
                      
                      {Object.keys(selectedDocument.ocrResults.keyValuePairs).length > 0 && (
                        <>
                          <h4>Key-Value Pairs:</h4>
                          <div className="key-value-pairs">
                            {Object.entries(selectedDocument.ocrResults.keyValuePairs).map(([key, value]) => (
                              <div key={key} className="key-value-pair">
                                <strong>{key}:</strong> {value}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {selectedDocument.classification && (
                  <div className="detail-section">
                    <h3>Classification</h3>
                    <p><strong>Category:</strong> {selectedDocument.classification.category}</p>
                    <p><strong>Confidence:</strong> {Math.round(selectedDocument.classification.confidence * 100)}%</p>
                  </div>
                )}

                {selectedDocument.summary && (
                  <div className="detail-section">
                    <h3>Summary</h3>
                    <div className="summary-content">
                      {selectedDocument.summary}
                    </div>
                  </div>
                )}

                {selectedDocument.errorMessage && (
                  <div className="detail-section error">
                    <h3>Error</h3>
                    <p>{selectedDocument.errorMessage}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
