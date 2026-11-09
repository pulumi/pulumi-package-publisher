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
- Node.js (the npm publisher sets up Node.js 26)
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

#### Trusted publishing

The Node.js, .NET and Python publishers can authenticate with GitHub Actions OIDC (trusted publishing) instead of
long-lived secrets. To set this up, you'll need to:
- Grant the publishing job `id-token: write` permissions
- Omit the long-lived token for the registry (`NODE_AUTH_TOKEN`, `NUGET_PUBLISH_KEY`, `PYPI_PASSWORD`)
- Pass the appropriate flags to the workflow (documented per-registry below)

##### npm

Set `npmTrustedPublishing: true` and omit `NODE_AUTH_TOKEN`. The Node.js publisher requires a GitHub-hosted runner,
npm >= 11.5.1, and Pulumi CLI >= 3.274.1 (which skips the `npm whoami` preflight for tokenless OIDC publishing).

Before publishing, configure the package on npm. The package must already exist, and the npm CLI that configures trust
must be npm >= 11.15.0:

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

##### NuGet

Set `nugetTrustedPublishing: true`, set `nugetUser` to the nuget.org username that owns the
trusted publishing policy, and omit `NUGET_PUBLISH_KEY`.

Before publishing, create a trusted publishing policy on nuget.org by following
[NuGet's trusted publishing guide](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing#github-actions-setup).

##### PyPI

Set `pypiTrustedPublishing: true` and omit `PYPI_USERNAME`/`PYPI_PASSWORD`.

Before publishing, add a trusted publisher to the project on PyPI by following
[PyPI's trusted publishing guide](https://docs.pypi.org/trusted-publishers/adding-a-publisher/).

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

###### Publish SDKs using trusted publishing

```yaml
permissions:
  contents: read
  id-token: write

steps:
  - uses: pulumi/pulumi-package-publisher@main
    with:
      sdk: nodejs,dotnet,python
      npmTrustedPublishing: true
      nugetTrustedPublishing: true
      nugetUser: pulumi
      pypiTrustedPublishing: true
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

### Development

The npm trusted-publishing prerequisites are implemented in
`lang/nodejs/assert-trusted-publishing.ts`. With Node.js 26, run the TypeScript unit and CLI integration tests with:

```sh
cd lang/nodejs
npm ci
npm test
```

The npm publisher and its tests run TypeScript directly using Node.js 26, without a compilation
step or runtime dependencies. `npm test` also runs `tsc --noEmit` for type checking.
