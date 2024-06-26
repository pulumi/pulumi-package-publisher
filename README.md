# pulumi-package-publisher

A composite action for publishing Pulumi packages

_This Action is currently in preview and meant for internal use. Any functionality can and likely will change._

### Purpose

This Action automates setup and publication to the package registries of four Pulumi languages.

### Setup

Ensure the following tools are installed:

- Pulumi CLI
- Go
- Node.js
- Python
- Java (and Gradle)

Set the following environment variables in your Workflow and your GitHub Action secrets:

```yaml
env:
    DOTNETVERSION: |
    6.0.x
    3.1.301
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GOVERSION: 1.20.1
    JAVAVERSION: "11"
    NODEVERSION: 16.x
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
    NUGET_PUBLISH_KEY: ${{ secrets.NUGET_PUBLISH_KEY }}
    PYPI_PASSWORD: ${{ secrets.PYPI_PASSWORD }}
    PYTHONVERSION: "3.9"
    SIGNING_KEY: ${{ secrets.JAVA_SIGNING_KEY }}
    SIGNING_KEY_ID: ${{ secrets.JAVA_SIGNING_KEY_ID }}
    SIGNING_PASSWORD: ${{ secrets.JAVA_SIGNING_PASSWORD }}
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

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
