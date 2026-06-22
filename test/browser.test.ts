import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveBrowserExecutable, isBrowserLaunchError } from "../src/browser.js";

// This test file itself is a guaranteed-to-exist path to stand in for a "browser".
const existingFile = fileURLToPath(import.meta.url);

test("honors an existing executable override (both env names)", () => {
  assert.equal(resolveBrowserExecutable({ MERMAID_MCP_EXECUTABLE_PATH: existingFile }), existingFile);
  assert.equal(resolveBrowserExecutable({ PUPPETEER_EXECUTABLE_PATH: existingFile }), existingFile);
});

test("override takes precedence over PUPPETEER_EXECUTABLE_PATH", () => {
  const resolved = resolveBrowserExecutable({
    MERMAID_MCP_EXECUTABLE_PATH: existingFile,
    PUPPETEER_EXECUTABLE_PATH: "/some/other/path",
  });
  assert.equal(resolved, existingFile);
});

test("throws when the override path does not exist", () => {
  assert.throws(
    () => resolveBrowserExecutable({ MERMAID_MCP_EXECUTABLE_PATH: "/no/such/browser-binary" }),
    /not found/i,
  );
});

test("auto-detection returns an existing file or undefined", () => {
  // No override: returns either a real installed browser path or undefined,
  // but never a non-existent path.
  const resolved = resolveBrowserExecutable({});
  if (resolved !== undefined) {
    assert.ok(existsSync(resolved), `detected browser should exist: ${resolved}`);
  }
});

test("classifies browser launch errors", () => {
  assert.ok(isBrowserLaunchError(new Error("Could not find Chrome (ver. 148.0.0)")));
  assert.ok(isBrowserLaunchError(new Error("Failed to launch the browser process! spawn ENOENT")));
  assert.ok(!isBrowserLaunchError(new Error("Diagram syntax error on line 3")));
});
