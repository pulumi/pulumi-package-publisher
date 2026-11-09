import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import { assertPrerequisites } from "./assert-trusted-publishing.ts";

const validEnv = {
    RUNNER_ENVIRONMENT: "github-hosted",
    ACTIONS_ID_TOKEN_REQUEST_URL: "https://example.invalid/token",
};

test("rejects self-hosted runners", () => {
    assert.throws(() => assertPrerequisites({ ...validEnv, RUNNER_ENVIRONMENT: "self-hosted" }),
        /GitHub-hosted runner/);
});

test("rejects missing OIDC permissions", () => {
    assert.throws(() => assertPrerequisites({ ...validEnv, ACTIONS_ID_TOKEN_REQUEST_URL: "" }),
        /id-token: write/);
});

test("rejects NODE_AUTH_TOKEN", () => {
    assert.throws(() => assertPrerequisites({ ...validEnv, NODE_AUTH_TOKEN: "test-token" }),
        /Remove NODE_AUTH_TOKEN/);
});

test("accepts npm 11.5.1 and Pulumi v3.274.1", () => {
    assert.doesNotThrow(() => assertPrerequisites(validEnv,
        (command) => command === "npm" ? "11.5.1" : "v3.274.1"));
});

test("rejects npm 11.5.0", () => {
    assert.throws(() => assertPrerequisites(validEnv,
        (command) => command === "npm" ? "11.5.0" : "v3.274.1"), {
        message: "npm trusted publishing requires npm >= 11.5.1; found 11.5.0",
    });
});

test("rejects Pulumi v3.274.0", () => {
    assert.throws(() => assertPrerequisites(validEnv,
        (command) => command === "npm" ? "11.5.1" : "v3.274.0"), {
        message: "npm trusted publishing requires Pulumi CLI >= 3.274.1; found v3.274.0",
    });
});

function runCLI(t: TestContext, missing?: "npm" | "pulumi") {
    const bin = mkdtempSync(join(tmpdir(), "publisher-test-"));
    t.after(() => rmSync(bin, { recursive: true, force: true }));
    if (missing !== "npm") {
        writeFileSync(join(bin, "npm"),
            "#!/bin/sh\n[ \"$1\" = '--version' ] || exit 1\nprintf '%s\\n' '11.5.1'\n",
            { mode: 0o755 });
    }
    if (missing !== "pulumi") {
        writeFileSync(join(bin, "pulumi"),
            "#!/bin/sh\n[ \"$1\" = 'version' ] || exit 1\nprintf '%s\\n' 'v3.274.1'\n",
            { mode: 0o755 });
    }
    return spawnSync(process.execPath, [join(import.meta.dirname, "assert-trusted-publishing.ts")], {
        env: { ...validEnv, PATH: bin },
        encoding: "utf8",
    });
}

test("CLI succeeds when all prerequisites are met", (t) => {
    const result = runCLI(t);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
});

test("CLI fails when npm is missing", (t) => {
    const result = runCLI(t, "npm");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unable to check npm version/);
});

test("CLI fails when Pulumi is missing", (t) => {
    const result = runCLI(t, "pulumi");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unable to check pulumi version/);
});
