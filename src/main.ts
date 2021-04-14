import { App } from '@aws-cdk/core';
import { AutoBrancherStack } from './AutoBrancherStack';
import { getRepoName } from './handlers/brancher';

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

const repository = app.node.tryGetContext('repository');
if (!repository) throw new Error('Please provide a context variable for the \'repository\'');
const topicArn = app.node.tryGetContext('topicArn');
if (!topicArn) throw new Error('Please provide a context variable for the \'topicArn\'');

const stackRepoName = getRepoName(repository);
new AutoBrancherStack(app, `auto-brancher-${stackRepoName}`, {
  env: devEnv,
  repository,
  topicArn,
});

app.synth();