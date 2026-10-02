# pulumi-package-publisher

A composite action for publishing Pulumi packages

_This Action is currently in preview and meant for internal use. Any functionality can and likely will change._

### Purpose

This Action automates setup and publication to the package registries of four Pulumi languages.

### Setup

Ensure the following tools are installed:

- Pulumi CLI
- pulumictl
- Go
- Node.js
- Python
- Java (and Gradle)

It's expected that the repository is checked out.

Set the following environment variables in your Workflow and your GitHub Action secrets:

```yaml
env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
    NUGET_PUBLISH_KEY: ${{ secrets.NUGET_PUBLISH_KEY }}
    PYPI_PASSWORD: ${{ secrets.PYPI_PASSWORD }}
    SIGNING_KEY: ${{ secrets.JAVA_SIGNING_KEY }}
    SIGNING_KEY_ID: ${{ secrets.JAVA_SIGNING_KEY_ID }}
    SIGNING_PASSWORD: ${{ secrets.JAVA_SIGNING_PASSWORD }}
```

To publish Node.js SDKs with npm trusted publishing, set `npmTrustedPublishing: true`, omit `NODE_AUTH_TOKEN`, and grant the publishing job `id-token: write` permissions. The Node.js publisher will require a GitHub-hosted runner and npm >= 11.5.1.

Before using npm trusted publishing, configure the package on npm. The package must already exist, and the npm CLI that configures trust must be npm >= 11.15.0:

```sh
npm install -g npm@^11.15.0
npm trust github <package-name> \
  --repo <owner>/<repo> \
  --file <workflow-file>.yml \
  --allow-publish
```

For example:

```sh
npm trust github @pulumi/example \
  --repo pulumi/pulumi-example \
  --file ci.yml \
  --allow-publish
```

The trusted publisher is bound to the GitHub repository and workflow file name that enter the workflow. Make sure the `--file` value matches the entry workflow that calls this action.

### Use

Add this action to your Workflow as a step to publish to all four supported registries:

- PyPI
- Maven
- npm
- nuget

```yaml
steps:
  - name: Publish all SDKs
    uses: pulumi/pulumi-package-publisher@v0.0.6
```

The workflow expects that your GitHub Actions have built the SDKs and created
[artifacts](https://github.com/actions/upload-artifact) with the following naming convention:

```yaml
- java-sdk.tar.gz
- nodejs-sdk.tar.gz
- python-sdk.tar.gz
- dotnet-sdk.tar.gz
```

Check out [pulumi/publish-go-sdk-action](https://github.com/pulumi/publish-go-sdk-action) for helping automate tagging
the generated Go SDK to make it available to end-users.

#### `with.sdk`

Optionally, you may specify language SDKs individually or in a comma separated list.

Valid inputs to `with.sdk` are:

- `all` - Equivalent to specifying all supported registries: `python,java,nodejs,dotnet`
- `python` - Publish to PyPI
- `java` - Publish to Maven
- `nodejs` - Publish to npm
- `dotnet` - Publish to nuget
- `!${LANG}` - To disable any of the above languages.

##### Examples

###### Publish the NodeJS SDK Only

```yaml
steps:
  - uses: pulumi/pulumi-package-publisher@main
    with:
      sdk: nodejs
```

###### Publish the NodeJS SDK using npm trusted publishing

```yaml
permissions:
  contents: read
  id-token: write

steps:
  - uses: pulumi/pulumi-package-publisher@main
    with:
      sdk: nodejs
      npmTrustedPublishing: true
```

###### Publish the Java and Python SDKs

```yaml
steps:
  - uses: pulumi/pulumi-package-publisher@main
    with:
      sdk: java,python
```

###### Publish every SDK except .NET

```yaml
steps:
  - uses: pulumi/pulumi-package-publisher@main
    with:
      sdk: all,!dotnet
```
