# Autobrancher

This is a microservice designed to create new branches in a CDK construct when a new version of the CDK core packages
are published. Details on this microservice and what it does can be found at [this blog](https://matthewbonig.com/2021/04/06/automating-construct-publishing/).

# Using this App

If you'd like to use this code start by putting in a PR to have your AWS account added to a list of allowed external
accounts that can be subscribed to the Construct Catalog topic. The code change is 
[here](https://github.com/construct-catalog/catalog/blob/master/packages/catalog/config.ts#L29).

Then you can synth the app, providing two context variables:

1. 'topicArn' for the topic to listen to. You can choose any topics
as long as it publishes messages this schema like:

```json
{
  "name": "@aws-cdk/core",
  "version": "1.97.0"
}
```

If you're subscribing to the Construct Catalog topic, use `arn:aws:sns:us-east-1:499430655523:construct-catalog-prod-RendererTopicD9CB70E6-TTOURYQEX9K1`

2. 'repository' for the SSH address of the repository to update. For example, `git@github.com:mbonig/rds-tools.git `

For example, you could run:

```shell
cdk synth -c repository=git@github.com:mbonig/rds-tools.git -c topicArn=arn:aws:sns:us-east-1:499430655523:construct-catalog-prod-RendererTopicD9CB70E6-TTOURYQEX9K1
```

## Post Stack manual updates

You will need an SSH keypair to push the new branch to the repository. After your stack is created, update the secret
called `auto-brancher-<your repo name>/deploy-key` with the *private* side of your keypair. The public key should be 
setup with your repository provider, like Github.

# Github Action

This microservice is used in conjunction with a Github Action to automate the bumping of CDK dependencies. You can 
see an example of this Github Action definition [in the rds-tools repository](https://github.com/mbonig/rds-tools/blob/master/.github/workflows/cdkbump.yml).

# Issues and Contributing

If you have any problems, please open an Issue on Github. PRs are always welcome.

