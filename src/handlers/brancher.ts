import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line import/no-extraneous-dependencies
import * as AWS from 'aws-sdk';
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';

const secretsManager = new AWS.SecretsManager();
const {
  REPOSITORY: repository,
  SECRET_ID: secretId,
} = process.env;

// eslint-disable-next-line @typescript-eslint/no-shadow
export function getRepoName(repository: string) {
  let match = repository!.match(new RegExp('((git|ssh|http(s)?)|(git@[\\w\\.]+))(:(//)?)([\\w\\.@\\/\\-~]+)\/([\\w\\.@\\/\\-~]+)(\\.git)(/)?') as any);
  if (!match) {
    const message = `Couldn't parse the repository name. Got: ${repository}`;
    console.error(message);
    throw new Error(message);
  }
  const repoName = match[8] as string;
  console.log('Found repoName: ', repoName);
  return repoName;
}

async function getSecretString() {
  const { SecretString: secretString } = await secretsManager.getSecretValue({ SecretId: secretId! }).promise();
  if (!secretString) {
    const message = `The secret string retrieved does not have a value. This should be a private SSH key used for accessing the repo: ${repository}`;
    console.error(message);
    throw new Error(message);
  }
  return secretString;
}

function writeDeployKey(deployKeyFileName: string, secretString: string) {
  fs.writeFileSync(deployKeyFileName, secretString);
  fs.chmodSync(deployKeyFileName, 0o400);
}

async function processRecord(record: any) {
  const {
    name,
    version,
  } = record; // e.g. {"name":"@aws-cdk/core","version":"1.97.0","url":"https://awscdk.io/packages/@aws-cdk/core@1.97.0/"}

  // we're going to base this check off of the @aws-cdk/pipelines module as it seeems to be published after all other packages
  if (name !== '@aws-cdk/pipelines') {
    console.info('Ignoring the publishing of construct, as it\'s not the CDK Core');
    return;
  }
  // let's make sure we have a version
  if (!version) {
    console.error('You gotta supply an event.version');
    return;
  }

  const workDir = path.join('/tmp', 'autobrancher');
  // ensure the workdir exists
  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir);
  }
  // setup simple-git
  const options: Partial<SimpleGitOptions> = {
    baseDir: workDir,
    binary: 'git',
    maxConcurrentProcesses: 6,
  };
  const git: SimpleGit = simpleGit(options);

  try {
    const branchName = `bump/${version}`;
    const secretString = await getSecretString();
    const repoName = getRepoName(repository!);
    const clonedPath = path.join(workDir, repoName!);

    // get and setup the deploy key needed to push back to the repo
    const deployKeyFileName = path.join(workDir, `deploy_keys_${new Date().valueOf()}`);
    writeDeployKey(deployKeyFileName, secretString);
    const GIT_SSH_COMMAND = `ssh -i ${deployKeyFileName} -o StrictHostKeyChecking=no`;
    await git.env({
      ...process.env,
      GIT_SSH_COMMAND,
    });
    console.log('Cloning repo');
    await git.clone(repository!);
    await git.cwd(clonedPath);

    console.log(`Creating new branch ${branchName}`);
    await git.checkoutLocalBranch(branchName);
    console.log('Pushing new branch');
    await git.push('origin', branchName);
    console.log('Branch pushed!');
  } catch (err) {
    console.error('An error happened:', err);
    throw err;
  } finally {
    fs.rmdirSync(workDir, { recursive: true });
  }
}

export const handler = async (event: any) => {
  console.log(JSON.stringify(event, null, 2));
  for (const record of event.Records) {

    let parsedMessage = JSON.parse(record.Sns.Message);
    if (!parsedMessage.dynamodb) {
      console.warn('Weird, no dynamodb record...', record);
    }
    const dbRecord = AWS.DynamoDB.Converter.unmarshall(parsedMessage.dynamodb.NewImage);

    await processRecord(dbRecord);
  }
};