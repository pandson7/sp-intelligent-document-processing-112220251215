#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { IntelligentDocumentProcessingStack112220251215 } from '../lib/cdk-app-stack';

const app = new cdk.App();
new IntelligentDocumentProcessingStack112220251215(app, 'IntelligentDocumentProcessingStack112220251215', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
});
