import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { AutoBrancherStack } from '../src/AutoBrancherStack';

test('Snapshot', () => {
  const app = new App();
  const stack = new AutoBrancherStack(app, 'test');

  expect(stack).not.toHaveResource('AWS::S3::Bucket');
  expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
});