# Intelligent Document Processing (IDP) - Architecture Diagrams

This directory contains AWS architecture diagrams for the Intelligent Document Processing application generated on 2025-11-22.

## Generated Diagrams

### 1. Main Architecture (`idp_main_architecture.png`)
- **Purpose**: High-level overview of the entire IDP system
- **Components**: User interface, API Gateway, Lambda functions, storage services, AI/ML services, and monitoring
- **Flow**: Shows the complete data flow from user interaction to document processing and results retrieval

### 2. Data Flow Pipeline (`idp_data_flow.png`)
- **Purpose**: Detailed step-by-step processing pipeline
- **Components**: Sequential processing stages from upload to final results
- **Flow**: Vertical flow showing the 6-stage processing pipeline:
  1. Document Upload
  2. Document Storage
  3. OCR Processing
  4. Document Classification
  5. Document Summarization
  6. Results Display

### 3. Infrastructure Components (`idp_infrastructure.png`)
- **Purpose**: Detailed AWS infrastructure and service relationships
- **Components**: All AWS services with their configurations and security settings
- **Details**: Shows service specifications, encryption, IAM roles, and monitoring setup

### 4. Deployment Architecture (`idp_deployment.png`)
- **Purpose**: CDK-based deployment structure and development workflow
- **Components**: CDK stacks, development environment, and deployed resources
- **Flow**: Shows how CDK stacks deploy to live AWS infrastructure

### 5. Security Architecture (`idp_security.png`)
- **Purpose**: Security controls, policies, and compliance monitoring
- **Components**: IAM roles, encryption, access controls, and security monitoring
- **Focus**: Data protection, access control, and security monitoring

## Architecture Highlights

### Key AWS Services Used:
- **Compute**: AWS Lambda (Node.js 18.x runtime)
- **API**: Amazon API Gateway (REST API with CORS)
- **Storage**: Amazon S3 (document storage), DynamoDB (metadata and results)
- **AI/ML**: AWS Textract (OCR), Comprehend (classification), Bedrock (summarization)
- **Security**: IAM roles, KMS encryption, S3 server-side encryption
- **Monitoring**: CloudWatch logs and metrics, CloudTrail
- **Infrastructure**: AWS CDK (TypeScript)

### Processing Pipeline:
1. **Upload**: React frontend → API Gateway → Lambda → S3 + DynamoDB
2. **OCR**: S3 event → Lambda → Textract → DynamoDB
3. **Classification**: DynamoDB stream → Lambda → Comprehend → DynamoDB
4. **Summarization**: DynamoDB stream → Lambda → Bedrock → DynamoDB
5. **Retrieval**: API Gateway → Lambda → DynamoDB → Frontend

### Security Features:
- Server-side encryption (SSE-S3) for S3 buckets
- DynamoDB encryption at rest
- IAM roles with least privilege principle
- API Gateway throttling and CORS policies
- CloudTrail for API logging
- AWS Config for compliance monitoring

### Scalability:
- Serverless architecture with auto-scaling Lambda functions
- DynamoDB on-demand billing
- S3 unlimited storage capacity
- Event-driven processing with DynamoDB streams

## File Locations:
All diagrams are saved as PNG files in this directory:
- `/home/pandson/echo-architect-artifacts/sp-intelligent-document-processing-112220251215/generated-diagrams/`

## Usage:
These diagrams can be used for:
- Technical documentation
- Architecture reviews
- Development planning
- Security assessments
- Deployment guidance
