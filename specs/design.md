# Technical Design Document

## Architecture Overview

The Intelligent Document Processing (IDP) application follows a serverless, event-driven architecture using AWS services. The system consists of a React frontend for user interaction, API Gateway for REST endpoints, Lambda functions for processing logic, and various AWS AI/ML services for document processing.

## System Architecture

### High-Level Components

1. **Frontend Layer**: React-based web application for document upload and results display
2. **API Layer**: Amazon API Gateway with Lambda integration
3. **Processing Layer**: AWS Lambda functions orchestrating the IDP pipeline
4. **AI/ML Services**: AWS Textract, Comprehend, and Bedrock for document processing
5. **Storage Layer**: Amazon S3 for document storage, DynamoDB for metadata and results
6. **Monitoring Layer**: CloudWatch for logging and monitoring

### Component Interactions

```
User → React Frontend → API Gateway → Lambda Functions → AI/ML Services
                                           ↓
                                    S3 + DynamoDB
```

## Detailed Component Design

### Frontend Application
- **Technology**: React with local development server
- **Features**: File upload, progress tracking, results display
- **Hosting**: Local development environment
- **API Communication**: REST calls to API Gateway endpoints

### API Gateway Configuration
- **Type**: REST API
- **Endpoints**:
  - POST /upload - Document upload
  - GET /documents/{id} - Retrieve document status and results
  - GET /documents - List all documents
- **CORS**: Enabled for local frontend access
- **Authentication**: None (prototype environment)

### Lambda Functions

#### 1. Upload Handler Function
- **Runtime**: Node.js 18.x
- **Purpose**: Handle document uploads and initiate processing
- **Triggers**: API Gateway POST /upload
- **Actions**:
  - Validate file format and size
  - Store document in S3
  - Create initial record in DynamoDB
  - Trigger OCR processing

#### 2. OCR Processing Function
- **Runtime**: Node.js 18.x
- **Purpose**: Extract text and key-value pairs using Textract
- **Triggers**: S3 object creation event
- **Actions**:
  - Call AWS Textract for text extraction
  - Parse and format results as JSON
  - Store OCR results in DynamoDB
  - Trigger classification function

#### 3. Classification Function
- **Runtime**: Node.js 18.x
- **Purpose**: Classify documents into predefined categories
- **Triggers**: DynamoDB stream from OCR completion
- **Actions**:
  - Use AWS Comprehend for document classification
  - Map results to predefined categories
  - Store classification results in DynamoDB
  - Trigger summarization function

#### 4. Summarization Function
- **Runtime**: Node.js 18.x
- **Purpose**: Generate document summaries using Bedrock
- **Triggers**: DynamoDB stream from classification completion
- **Actions**:
  - Call Amazon Bedrock with Claude model
  - Generate concise document summary
  - Store summary in DynamoDB
  - Update document status to completed

#### 5. Results Retrieval Function
- **Runtime**: Node.js 18.x
- **Purpose**: Retrieve document processing results
- **Triggers**: API Gateway GET requests
- **Actions**:
  - Query DynamoDB for document information
  - Format and return results to frontend

### Storage Design

#### Amazon S3 Bucket
- **Purpose**: Store uploaded documents
- **Structure**:
  ```
  idp-documents-bucket/
  ├── documents/
  │   ├── {document-id}.{extension}
  ```
- **Configuration**:
  - Versioning: Disabled
  - Encryption: Server-side encryption (SSE-S3)
  - Event notifications: Trigger Lambda on object creation

#### DynamoDB Table
- **Table Name**: idp-documents
- **Primary Key**: documentId (String)
- **Attributes**:
  - documentId: Unique identifier
  - fileName: Original file name
  - fileSize: File size in bytes
  - uploadTimestamp: Upload time
  - status: Processing status (uploaded, ocr-complete, classified, summarized, completed, failed)
  - ocrResults: JSON object with extracted text and key-value pairs
  - classification: Document category and confidence score
  - summary: Generated document summary
  - errorMessage: Error details if processing fails
- **Indexes**:
  - GSI on status for filtering documents by processing stage
- **Streams**: Enabled to trigger downstream processing

### AI/ML Services Configuration

#### AWS Textract
- **Service**: Amazon Textract
- **APIs Used**:
  - DetectDocumentText: For basic text extraction
  - AnalyzeDocument: For key-value pair extraction
- **Supported Formats**: PDF, JPEG, PNG
- **Output**: JSON with text blocks and key-value relationships

#### AWS Comprehend
- **Service**: Amazon Comprehend Custom Classification
- **Model**: Custom classifier trained on document categories
- **Categories**: Dietary Supplement, Stationery, Kitchen Supplies, Medicine, Driver License, Invoice, W2, Other
- **Input**: Extracted text from Textract
- **Output**: Category classification with confidence score

#### Amazon Bedrock
- **Model**: Claude (Anthropic)
- **Purpose**: Document summarization
- **Input**: Extracted text and classification results
- **Output**: Concise document summary
- **Configuration**: Temperature 0.3 for consistent results

## Security Considerations

### Data Protection
- S3 bucket encryption at rest
- DynamoDB encryption at rest
- Lambda environment variables encryption
- No sensitive data in logs

### Access Control
- IAM roles with least privilege principle
- Lambda execution roles with specific service permissions
- S3 bucket policies restricting access
- DynamoDB resource-based policies

### Network Security
- API Gateway with throttling enabled
- Lambda functions in VPC (if required)
- Security groups restricting access

## Performance Considerations

### Scalability
- Lambda functions auto-scale based on demand
- DynamoDB on-demand billing for variable workloads
- S3 handles unlimited storage requirements
- API Gateway supports high request volumes

### Optimization
- Lambda function memory allocation: 512MB-1GB based on processing needs
- DynamoDB read/write capacity: On-demand mode
- S3 transfer acceleration for large files
- CloudWatch monitoring for performance metrics

## Monitoring and Logging

### CloudWatch Integration
- Lambda function logs and metrics
- API Gateway access logs and metrics
- DynamoDB performance metrics
- Custom metrics for processing pipeline stages

### Error Handling
- Dead letter queues for failed Lambda invocations
- Retry logic with exponential backoff
- Comprehensive error logging
- Alert notifications for critical failures

## Deployment Architecture

### Infrastructure as Code
- **Tool**: AWS CDK (TypeScript)
- **Stacks**:
  - Storage Stack: S3, DynamoDB
  - Compute Stack: Lambda functions
  - API Stack: API Gateway
  - Monitoring Stack: CloudWatch dashboards and alarms

### Development Workflow
1. Local development with CDK
2. Deploy to AWS using CDK commands
3. Frontend runs locally connecting to AWS APIs
4. Testing with sample documents from ~/ea_sample_docs/idp_docs

## Data Flow Sequence

```
1. User uploads document via React frontend
2. API Gateway receives upload request
3. Upload Lambda validates and stores file in S3
4. S3 event triggers OCR Lambda function
5. OCR Lambda calls Textract and stores results in DynamoDB
6. DynamoDB stream triggers Classification Lambda
7. Classification Lambda calls Comprehend and updates DynamoDB
8. DynamoDB stream triggers Summarization Lambda
9. Summarization Lambda calls Bedrock and completes processing
10. Frontend polls API for results and displays to user
```

## Technology Stack Summary

- **Frontend**: React, JavaScript, HTML5, CSS3
- **Backend**: Node.js, AWS Lambda
- **API**: Amazon API Gateway (REST)
- **Storage**: Amazon S3, DynamoDB
- **AI/ML**: AWS Textract, Comprehend, Bedrock (Claude)
- **Infrastructure**: AWS CDK (TypeScript)
- **Monitoring**: Amazon CloudWatch
- **Development**: Local React dev server, AWS CLI
