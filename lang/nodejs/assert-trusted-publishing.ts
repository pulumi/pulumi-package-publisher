import { execFileSync } from "node:child_process";

type GetVersion = (command: string, args: string[]) => string;

function assertVersion(tool: string, actual: string, required: string): void {
    const match = /^v?(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.exec(actual);
    const [major, minor, patch] = required.split(".").map(Number);
    const comparison = match && (
        Number(match[1]) - major ||
        Number(match[2]) - minor ||
        Number(match[3]) - patch
    );
    if (comparison === null || comparison < 0 || (comparison === 0 && match?.[4])) {
        throw new Error(`npm trusted publishing requires ${tool} >= ${required}; found ${actual}`);
    }
}

function readVersion(command: string, args: string[]): string {
    try {
        return execFileSync(command, args, { encoding: "utf8" }).trim();
    } catch (error) {
        throw new Error(`Unable to check ${command} version. Ensure it is installed and on PATH.`, { cause: error });
    }
}

export function assertPrerequisites(
    env: NodeJS.ProcessEnv = process.env,
    getVersion: GetVersion = readVersion,
): void {
    if (env.RUNNER_ENVIRONMENT !== "github-hosted") {
        throw new Error("npm trusted publishing requires a GitHub-hosted runner.");
    }
    if (!env.ACTIONS_ID_TOKEN_REQUEST_URL) {
        throw new Error("npm trusted publishing requires GitHub Actions OIDC. Set 'id-token: write' on this job.");
    }
    if (env.NODE_AUTH_TOKEN) {
        throw new Error("npmTrustedPublishing is enabled, but NODE_AUTH_TOKEN is set. Remove NODE_AUTH_TOKEN to publish with OIDC.");
    }
    assertVersion("npm", getVersion("npm", ["--version"]), "11.5.1");
    assertVersion("Pulumi CLI", getVersion("pulumi", ["version"]), "3.274.1");
}

if (import.meta.main) {
    try {
        assertPrerequisites();
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}
