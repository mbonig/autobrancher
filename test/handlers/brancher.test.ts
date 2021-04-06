import * as path from 'path';

describe('brancher', () => {
  process.env.SECRET_ID = 'arn:aws:secretsmanager:us-east-1:536309290949:secret:auto-brancher/deploy-key-yz1BE3';
  process.env.REPOSITORY = 'git@github.com:mbonig/rds-tools.git';
  process.env.AWS_REGION = 'us-east-1';
  process.env.AWS_PROFILE = 'personal';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { handler } = require(path.join(__dirname, '..', '..', 'src', 'handlers', 'brancher'));
  it('does things', async () => {
    await handler({
      version: '1.96.0',
    });
  });
});