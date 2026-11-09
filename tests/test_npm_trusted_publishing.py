"""Run with: python3 -m unittest discover -s tests -v"""

import os
from pathlib import Path
import subprocess
import tempfile
import textwrap
import unittest


ACTION = Path(__file__).resolve().parents[1] / "lang/nodejs/action.yml"


class TrustedPublishingTests(unittest.TestCase):
    def setUp(self):
        action = ACTION.read_text()
        step = action.split("    - name: Assert npm trusted publishing prerequisites\n", 1)[1]
        self.assertIn("if: ${{ inputs.npmTrustedPublishing == 'true' }}", step)
        self.script = textwrap.dedent(step.split("      run: |\n", 1)[1].split("      shell: bash", 1)[0])
        self.bin = tempfile.TemporaryDirectory()
        self.addCleanup(self.bin.cleanup)
        for tool, variable in [("npm", "TEST_NPM_VERSION"), ("pulumi", "TEST_PULUMI_VERSION")]:
            path = Path(self.bin.name) / tool
            path.write_text(f'#!/bin/sh\nprintf "%s\\n" "${variable}"\n')
            path.chmod(0o755)

    def run_check(self, npm="11.5.1", pulumi="v3.274.1", **overrides):
        env = dict(os.environ)
        env.update(
            PATH=self.bin.name + os.pathsep + env["PATH"],
            RUNNER_ENVIRONMENT="github-hosted",
            ACTIONS_ID_TOKEN_REQUEST_URL="https://example.invalid/token",
            NODE_AUTH_TOKEN="",
            TEST_NPM_VERSION=npm,
            TEST_PULUMI_VERSION=pulumi,
        )
        env.update(overrides)
        return subprocess.run(["bash", "-c", self.script], env=env, capture_output=True, text=True)

    def test_supported_versions(self):
        for version in ["3.274.1", "v3.274.1", "v3.274.1+build.1", "v3.274.2", "v3.275.0", "v4.0.0"]:
            with self.subTest(pulumi=version):
                result = self.run_check(pulumi=version)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        for version in ["11.5.1", "11.5.2", "11.6.0", "12.0.0"]:
            with self.subTest(npm=version):
                result = self.run_check(npm=version)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_unsupported_versions(self):
        for version in ["v3.274.0", "v3.273.99", "v2.999.0", "v3.274.1-dev.1", "v3.274.1-rc.1", "garbage", "", "v3.274"]:
            with self.subTest(pulumi=version):
                result = self.run_check(pulumi=version)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("requires Pulumi CLI >= 3.274.1", result.stderr)
        for version in ["11.5.0", "11.4.99", "10.99.0", "11.5.1-pre.1", "garbage", ""]:
            with self.subTest(npm=version):
                result = self.run_check(npm=version)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("requires npm >= 11.5.1", result.stderr)

    def test_other_prerequisites(self):
        for overrides, message in [
            ({"RUNNER_ENVIRONMENT": "self-hosted"}, "requires a GitHub-hosted runner"),
            ({"ACTIONS_ID_TOKEN_REQUEST_URL": ""}, "Set 'id-token: write'"),
            ({"NODE_AUTH_TOKEN": "test-token"}, "Remove NODE_AUTH_TOKEN"),
        ]:
            with self.subTest(overrides=overrides):
                result = self.run_check(**overrides)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(message, result.stdout)


if __name__ == "__main__":
    unittest.main()
