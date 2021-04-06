import * as AWS from 'aws-sdk';
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

const secretsManager = new AWS.SecretsManager();
const {
  REPOSITORY: repository,
  SECRET_ID: secretId,
} = process.env;
export const handler = async (event: any) => {
  console.log(JSON.stringify(event, null, 2));
  const { version } = event;
  if (!version) {
    console.error('You gotta supply an event.version');
    return;
  }

  const workDir = path.join('/tmp', 'autobrancher');
  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir);
  }
  const options: Partial<SimpleGitOptions> = {
    baseDir: workDir,
    binary: 'git',
    maxConcurrentProcesses: 6,
  };
  const git: SimpleGit = simpleGit(options);

  try {

    const { SecretString: secretString } = await secretsManager.getSecretValue({ SecretId: secretId! }).promise();
    if (!secretString) {
      const message = `The secret string retrieved does not have a value. This should be a private SSH key used for accessing the repo: ${repository}`;
      console.error(message);
      throw new Error(message);
    }
    let match = repository!.match(new RegExp('((git|ssh|http(s)?)|(git@[\\w\\.]+))(:(//)?)([\\w\\.@\\/\\-~]+)\/([\\w\\.@\\/\\-~]+)(\\.git)(/)?') as any);
    if (!match) {
      const message = `Couldn't parse the repository name. Got: ${repository}`;
      console.error(message);
      throw new Error(message);
    }
    const repoName = match[8] as string;
    console.log('Found reponame: ', repoName);
    const clonedPath = path.join(workDir, repoName!);
    const deployKeyFileName = path.join(workDir, `deploy_keys_${new Date().valueOf()}`);
    fs.writeFileSync(deployKeyFileName, secretString);
    fs.chmodSync(deployKeyFileName, 0o400);

    const GIT_SSH_COMMAND = `ssh -i ${deployKeyFileName} -o StrictHostKeyChecking=no`;
    await git.env({
      ...process.env,
      GIT_SSH_COMMAND,
    });
    await git.clone(repository!);
    await git.cwd(clonedPath);

    const branchName = `bump/${version}`; // this should be replaced with a prop and existing as default

    await git.checkoutLocalBranch(branchName);
    await git.push('origin', branchName);

  } catch (err) {
    console.error('An error happened:', err);
    throw err;
  } finally {
    fs.rmdirSync(workDir, { recursive: true });
  }


};