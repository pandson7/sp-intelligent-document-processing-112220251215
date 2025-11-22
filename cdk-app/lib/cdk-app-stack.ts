import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';

export class IntelligentDocumentProcessingStack112220251215 extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const suffix = '112220251215';

    // S3 Bucket for document storage
    const documentsBucket = new s3.Bucket(this, `DocumentsBucket${suffix}`, {
      bucketName: `idp-documents-${suffix}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // DynamoDB Table for document metadata and results
    const documentsTable = new dynamodb.Table(this, `DocumentsTable${suffix}`, {
      tableName: `idp-documents-${suffix}`,
      partitionKey: { name: 'documentId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Enable auto scaling
    documentsTable.autoScaleReadCapacity({
      minCapacity: 1,
      maxCapacity: 10,
    });
    documentsTable.autoScaleWriteCapacity({
      minCapacity: 1,
      maxCapacity: 10,
    });

    // IAM Role for Lambda functions
    const lambdaRole = new iam.Role(this, `LambdaRole${suffix}`, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
              resources: [documentsBucket.bucketArn + '/*'],
            }),
          ],
        }),
        DynamoDBAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:PutItem',
                'dynamodb:GetItem',
                'dynamodb:UpdateItem',
                'dynamodb:Query',
                'dynamodb:Scan',
                'dynamodb:GetRecords',
                'dynamodb:GetShardIterator',
                'dynamodb:DescribeStream',
                'dynamodb:ListStreams',
              ],
              resources: [
                documentsTable.tableArn,
                documentsTable.tableArn + '/stream/*',
              ],
            }),
          ],
        }),
        TextractAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'textract:DetectDocumentText',
                'textract:AnalyzeDocument',
              ],
              resources: ['*'],
            }),
          ],
        }),
        ComprehendAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'comprehend:DetectSentiment',
                'comprehend:ClassifyDocument',
              ],
              resources: ['*'],
            }),
          ],
        }),
        BedrockAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel',
              ],
              resources: [
                'arn:aws:bedrock:*:*:inference-profile/global.anthropic.claude-sonnet-4-20250514-v1:0',
                'arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0'
              ],
            }),
          ],
        }),
      },
    });

    // Upload Handler Lambda
    const uploadHandler = new lambda.Function(this, `UploadHandler${suffix}`, {
      functionName: `idp-upload-handler-${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({});
const dynamodb = new DynamoDBClient({});

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    const body = JSON.parse(event.body);
    const { fileName, fileType } = body;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(fileType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid file type' })
      };
    }

    const documentId = Date.now().toString();
    const key = \`documents/\${documentId}.\${fileName.split('.').pop()}\`;

    // Create presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
      ContentType: fileType
    });
    
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    // Create initial record in DynamoDB
    await dynamodb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        documentId: { S: documentId },
        fileName: { S: fileName },
        s3Key: { S: key },
        status: { S: 'uploaded' },
        uploadTimestamp: { S: new Date().toISOString() }
      }
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        documentId, 
        uploadUrl,
        message: 'Upload URL generated successfully' 
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
      `),
      environment: {
        BUCKET_NAME: documentsBucket.bucketName,
        TABLE_NAME: documentsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    });

    // OCR Processing Lambda
    const ocrProcessor = new lambda.Function(this, `OCRProcessor${suffix}`, {
      functionName: `idp-ocr-processor-${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { TextractClient, DetectDocumentTextCommand, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');
const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

const textract = new TextractClient({});
const dynamodb = new DynamoDBClient({});

exports.handler = async (event) => {
  try {
    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\\+/g, ' '));
      
      // Extract document ID from key
      const documentId = key.split('/')[1].split('.')[0];
      
      console.log(\`Processing OCR for document: \${documentId}\`);

      // Analyze document with Textract
      const analyzeCommand = new AnalyzeDocumentCommand({
        Document: {
          S3Object: {
            Bucket: bucket,
            Name: key
          }
        },
        FeatureTypes: ['FORMS', 'TABLES']
      });

      const result = await textract.send(analyzeCommand);
      
      // Extract text and key-value pairs
      const extractedData = {
        text: '',
        keyValuePairs: {},
        tables: []
      };

      // Process blocks
      const blocks = result.Blocks || [];
      const keyMap = {};
      const valueMap = {};
      const blockMap = {};

      // Build block map
      blocks.forEach(block => {
        blockMap[block.Id] = block;
        if (block.BlockType === 'KEY_VALUE_SET') {
          if (block.EntityTypes && block.EntityTypes.includes('KEY')) {
            keyMap[block.Id] = block;
          } else {
            valueMap[block.Id] = block;
          }
        }
      });

      // Extract text
      blocks.forEach(block => {
        if (block.BlockType === 'LINE') {
          extractedData.text += block.Text + '\\n';
        }
      });

      // Extract key-value pairs
      Object.values(keyMap).forEach(keyBlock => {
        const keyText = getTextFromBlock(keyBlock, blockMap);
        let valueText = '';
        
        if (keyBlock.Relationships) {
          keyBlock.Relationships.forEach(relationship => {
            if (relationship.Type === 'VALUE') {
              relationship.Ids.forEach(valueId => {
                const valueBlock = valueMap[valueId];
                if (valueBlock) {
                  valueText = getTextFromBlock(valueBlock, blockMap);
                }
              });
            }
          });
        }
        
        if (keyText && valueText) {
          extractedData.keyValuePairs[keyText] = valueText;
        }
      });

      // Update DynamoDB with OCR results
      await dynamodb.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          documentId: { S: documentId }
        },
        UpdateExpression: 'SET ocrResults = :ocr, #status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':ocr': { S: JSON.stringify(extractedData) },
          ':status': { S: 'ocr-complete' }
        }
      }));

      console.log(\`OCR processing completed for document: \${documentId}\`);
    }
  } catch (error) {
    console.error('OCR processing error:', error);
    throw error;
  }
};

function getTextFromBlock(block, blockMap) {
  let text = '';
  if (block.Relationships) {
    block.Relationships.forEach(relationship => {
      if (relationship.Type === 'CHILD') {
        relationship.Ids.forEach(childId => {
          const childBlock = blockMap[childId];
          if (childBlock && childBlock.BlockType === 'WORD') {
            text += childBlock.Text + ' ';
          }
        });
      }
    });
  }
  return text.trim();
}
      `),
      environment: {
        TABLE_NAME: documentsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(300),
    });

    // Add S3 trigger for OCR processor
    documentsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(ocrProcessor),
      { prefix: 'documents/' }
    );

    // Classification Lambda
    const classificationProcessor = new lambda.Function(this, `ClassificationProcessor${suffix}`, {
      functionName: `idp-classification-processor-${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { DynamoDBClient, UpdateItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamodb = new DynamoDBClient({});

const categories = [
  'Dietary Supplement', 'Stationery', 'Kitchen Supplies', 
  'Medicine', 'Driver License', 'Invoice', 'W2', 'Other'
];

exports.handler = async (event) => {
  try {
    for (const record of event.Records) {
      if (record.eventName === 'MODIFY') {
        const documentId = record.dynamodb.Keys.documentId.S;
        const newImage = record.dynamodb.NewImage;
        
        if (newImage.status.S === 'ocr-complete') {
          console.log(\`Processing classification for document: \${documentId}\`);
          
          // Get OCR results
          const getResult = await dynamodb.send(new GetItemCommand({
            TableName: process.env.TABLE_NAME,
            Key: { documentId: { S: documentId } }
          }));
          
          const ocrResults = JSON.parse(getResult.Item.ocrResults.S);
          const text = ocrResults.text.toLowerCase();
          
          // Simple rule-based classification
          let category = 'Other';
          let confidence = 0.5;
          
          if (text.includes('license') || text.includes('driver')) {
            category = 'Driver License';
            confidence = 0.9;
          } else if (text.includes('invoice') || text.includes('bill') || text.includes('amount due')) {
            category = 'Invoice';
            confidence = 0.85;
          } else if (text.includes('w-2') || text.includes('wages') || text.includes('tax')) {
            category = 'W2';
            confidence = 0.8;
          } else if (text.includes('supplement') || text.includes('vitamin')) {
            category = 'Dietary Supplement';
            confidence = 0.75;
          } else if (text.includes('medicine') || text.includes('prescription') || text.includes('drug')) {
            category = 'Medicine';
            confidence = 0.8;
          } else if (text.includes('kitchen') || text.includes('cooking')) {
            category = 'Kitchen Supplies';
            confidence = 0.7;
          } else if (text.includes('stationery') || text.includes('office') || text.includes('paper')) {
            category = 'Stationery';
            confidence = 0.7;
          }
          
          const classification = {
            category,
            confidence,
            timestamp: new Date().toISOString()
          };
          
          // Update DynamoDB with classification results
          await dynamodb.send(new UpdateItemCommand({
            TableName: process.env.TABLE_NAME,
            Key: { documentId: { S: documentId } },
            UpdateExpression: 'SET classification = :classification, #status = :status',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':classification': { S: JSON.stringify(classification) },
              ':status': { S: 'classified' }
            }
          }));
          
          console.log(\`Classification completed for document: \${documentId}, category: \${category}\`);
        }
      }
    }
  } catch (error) {
    console.error('Classification processing error:', error);
    throw error;
  }
};
      `),
      environment: {
        TABLE_NAME: documentsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(60),
    });

    // Add DynamoDB stream trigger for classification
    classificationProcessor.addEventSourceMapping('ClassificationTrigger', {
      eventSourceArn: documentsTable.tableStreamArn!,
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 1,
    });

    // Summarization Lambda
    const summarizationProcessor = new lambda.Function(this, `SummarizationProcessor${suffix}`, {
      functionName: `idp-summarization-processor-${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient, UpdateItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');

const bedrock = new BedrockRuntimeClient({});
const dynamodb = new DynamoDBClient({});

exports.handler = async (event) => {
  try {
    for (const record of event.Records) {
      if (record.eventName === 'MODIFY') {
        const documentId = record.dynamodb.Keys.documentId.S;
        const newImage = record.dynamodb.NewImage;
        
        if (newImage.status.S === 'classified') {
          console.log(\`Processing summarization for document: \${documentId}\`);
          
          // Get document data
          const getResult = await dynamodb.send(new GetItemCommand({
            TableName: process.env.TABLE_NAME,
            Key: { documentId: { S: documentId } }
          }));
          
          const ocrResults = JSON.parse(getResult.Item.ocrResults.S);
          const classification = JSON.parse(getResult.Item.classification.S);
          
          const prompt = \`Please provide a concise summary of this \${classification.category} document:

Text content:
\${ocrResults.text}

Key-value pairs:
\${JSON.stringify(ocrResults.keyValuePairs, null, 2)}

Please provide a brief, informative summary focusing on the key information and purpose of this document.\`;

          // Call Bedrock for summarization
          const command = new InvokeModelCommand({
            modelId: 'global.anthropic.claude-sonnet-4-20250514-v1:0',
            body: JSON.stringify({
              anthropic_version: 'bedrock-2023-05-31',
              max_tokens: 300,
              temperature: 0.3,
              messages: [{
                role: 'user',
                content: prompt
              }]
            }),
            contentType: 'application/json',
            accept: 'application/json'
          });

          const response = await bedrock.send(command);
          const responseBody = JSON.parse(new TextDecoder().decode(response.body));
          const summary = responseBody.content[0].text;
          
          // Update DynamoDB with summary
          await dynamodb.send(new UpdateItemCommand({
            TableName: process.env.TABLE_NAME,
            Key: { documentId: { S: documentId } },
            UpdateExpression: 'SET summary = :summary, #status = :status, completedTimestamp = :completed',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':summary': { S: summary },
              ':status': { S: 'completed' },
              ':completed': { S: new Date().toISOString() }
            }
          }));
          
          console.log(\`Summarization completed for document: \${documentId}\`);
        }
      }
    }
  } catch (error) {
    console.error('Summarization processing error:', error);
    
    // Update status to completed with error
    if (error.documentId) {
      await dynamodb.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: { documentId: { S: error.documentId } },
        UpdateExpression: 'SET #status = :status, errorMessage = :error',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': { S: 'completed' },
          ':error': { S: error.message }
        }
      }));
    }
  }
};
      `),
      environment: {
        TABLE_NAME: documentsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(300),
    });

    // Add DynamoDB stream trigger for summarization
    summarizationProcessor.addEventSourceMapping('SummarizationTrigger', {
      eventSourceArn: documentsTable.tableStreamArn!,
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 1,
    });

    // Results Retrieval Lambda
    const resultsHandler = new lambda.Function(this, `ResultsHandler${suffix}`, {
      functionName: `idp-results-handler-${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { DynamoDBClient, GetItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');

const dynamodb = new DynamoDBClient({});

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    const { pathParameters, httpMethod } = event;
    
    if (httpMethod === 'GET' && pathParameters && pathParameters.id) {
      // Get specific document
      const documentId = pathParameters.id;
      
      const result = await dynamodb.send(new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: { documentId: { S: documentId } }
      }));
      
      if (!result.Item) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Document not found' })
        };
      }
      
      const document = {
        documentId: result.Item.documentId.S,
        fileName: result.Item.fileName.S,
        status: result.Item.status.S,
        uploadTimestamp: result.Item.uploadTimestamp.S,
        ocrResults: result.Item.ocrResults ? JSON.parse(result.Item.ocrResults.S) : null,
        classification: result.Item.classification ? JSON.parse(result.Item.classification.S) : null,
        summary: result.Item.summary ? result.Item.summary.S : null,
        completedTimestamp: result.Item.completedTimestamp ? result.Item.completedTimestamp.S : null,
        errorMessage: result.Item.errorMessage ? result.Item.errorMessage.S : null
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(document)
      };
    } else if (httpMethod === 'GET') {
      // Get all documents
      const result = await dynamodb.send(new ScanCommand({
        TableName: process.env.TABLE_NAME
      }));
      
      const documents = result.Items.map(item => ({
        documentId: item.documentId.S,
        fileName: item.fileName.S,
        status: item.status.S,
        uploadTimestamp: item.uploadTimestamp.S,
        classification: item.classification ? JSON.parse(item.classification.S) : null,
        completedTimestamp: item.completedTimestamp ? item.completedTimestamp.S : null
      }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ documents })
      };
    }
    
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
      `),
      environment: {
        TABLE_NAME: documentsTable.tableName,
      },
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
    });

    // API Gateway
    const api = new apigateway.RestApi(this, `IDPApi${suffix}`, {
      restApiName: `idp-api-${suffix}`,
      description: 'Intelligent Document Processing API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    // Upload endpoint
    const uploadResource = api.root.addResource('upload');
    uploadResource.addMethod('POST', new apigateway.LambdaIntegration(uploadHandler));

    // Documents endpoint
    const documentsResource = api.root.addResource('documents');
    documentsResource.addMethod('GET', new apigateway.LambdaIntegration(resultsHandler));
    
    const documentResource = documentsResource.addResource('{id}');
    documentResource.addMethod('GET', new apigateway.LambdaIntegration(resultsHandler));

    // Output API Gateway URL
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: documentsBucket.bucketName,
      description: 'S3 Bucket Name',
    });
  }
}
