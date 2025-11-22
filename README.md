# Intelligent Document Processing (IDP) Solution

A comprehensive AWS-based solution for intelligent document processing using AI/ML services to extract, analyze, and process documents at scale.

## Overview

This project implements an end-to-end intelligent document processing pipeline that leverages AWS services including Amazon Textract, Amazon Comprehend, and Amazon Bedrock to automatically extract text, analyze content, and generate insights from various document types.

## Architecture

The solution consists of:

- **Frontend Application**: React-based web interface for document upload and results visualization
- **CDK Infrastructure**: AWS CDK code for deploying all required AWS resources
- **Lambda Functions**: Serverless processing functions for document analysis
- **Architecture Diagrams**: Visual representations of the system design
- **Cost Analysis**: Detailed pricing breakdown and optimization recommendations

## Key Features

- Multi-format document support (PDF, images, text files)
- Real-time document processing pipeline
- AI-powered content analysis and extraction
- Scalable serverless architecture
- Cost-optimized resource allocation
- Comprehensive monitoring and logging

## Project Structure

```
├── cdk-app/                    # AWS CDK infrastructure code
├── src/
│   ├── frontend/              # React frontend application
│   └── lambda/                # Lambda function implementations
├── specs/                     # Requirements and design documentation
├── generated-diagrams/        # Architecture and system diagrams
├── pricing/                   # Cost analysis and optimization
├── tests/                     # Test specifications
└── docs/                      # Additional documentation
```

## Quick Start

### Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js 18+ and npm
- AWS CDK CLI installed

### Deployment

1. **Deploy Infrastructure**:
   ```bash
   cd cdk-app
   npm install
   cdk deploy
   ```

2. **Deploy Frontend**:
   ```bash
   cd src/frontend
   npm install
   npm run build
   # Deploy to S3 bucket created by CDK
   ```

## Documentation

- [Requirements](specs/requirements.md) - Detailed functional and non-functional requirements
- [Design Document](specs/design.md) - System architecture and design decisions
- [Task Breakdown](specs/tasks.md) - Development tasks and implementation plan
- [Cost Analysis](pricing/idp_cost_analysis.md) - Pricing breakdown and optimization strategies

## Architecture Diagrams

The `generated-diagrams/` folder contains comprehensive visual documentation:

- Main Architecture Overview
- Data Flow Diagrams
- Security Architecture
- Deployment Architecture
- Infrastructure Components

## Development

### Running Tests

```bash
cd cdk-app
npm test
```

### Local Development

```bash
cd src/frontend
npm start
```

## Cost Optimization

This solution is designed with cost optimization in mind:

- Serverless architecture minimizes idle costs
- S3 Intelligent Tiering for storage optimization
- Lambda provisioned concurrency only where needed
- CloudWatch log retention policies

See [Cost Analysis](pricing/idp_cost_analysis.md) for detailed breakdown.

## Security

The solution implements AWS security best practices:

- IAM roles with least privilege access
- VPC isolation for sensitive components
- Encryption at rest and in transit
- CloudTrail logging for audit compliance

## Monitoring

Comprehensive monitoring includes:

- CloudWatch metrics and alarms
- X-Ray distributed tracing
- Application performance monitoring
- Cost and usage tracking

## Contributing

1. Review the design documentation in `specs/`
2. Follow the task breakdown in `specs/tasks.md`
3. Ensure all tests pass before submitting changes
4. Update documentation as needed

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues, please refer to the project documentation or create an issue in the repository.
