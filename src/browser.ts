import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Candidate install locations for a Chromium-family browser the user may already
 * have, in preference order, for the current platform.
 */
function systemBrowserCandidates(env: NodeJS.ProcessEnv): string[] {
  if (process.platform === "win32") {
    const programFiles = env.PROGRAMFILES ?? "C:\\Program Files";
    const programFilesX86 = env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)";
    const localAppData = env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
    return [
      join(programFiles, "Google\\Chrome\\Application\\chrome.exe"),
      join(programFilesX86, "Google\\Chrome\\Application\\chrome.exe"),
      join(localAppData, "Google\\Chrome\\Application\\chrome.exe"),
      join(programFiles, "Microsoft\\Edge\\Application\\msedge.exe"),
      join(programFilesX86, "Microsoft\\Edge\\Application\\msedge.exe"),
    ];
  }
  if (process.platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ];
  }
  // Linux and other Unixes.
  return [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/opt/google/chrome/chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "/usr/bin/microsoft-edge",
    "/usr/bin/microsoft-edge-stable",
  ];
}

/**
 * Resolve a Chromium-family browser executable for rendering.
 *
 * Preference order:
 *   1. An explicit override — `MERMAID_MCP_EXECUTABLE_PATH` or `PUPPETEER_EXECUTABLE_PATH`.
 *   2. A browser the user already has installed (Chrome / Edge / Chromium).
 *   3. `undefined` — let mermaid-cli fall back to puppeteer's bundled/downloaded Chromium.
 *
 * Throws only when an explicit override is set but the file is missing — a
 * misconfiguration worth surfacing immediately rather than silently ignoring.
 */
export function resolveBrowserExecutable(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const override = env.MERMAID_MCP_EXECUTABLE_PATH ?? env.PUPPETEER_EXECUTABLE_PATH;
  if (override && override.trim()) {
    if (existsSync(override)) return override;
    throw new Error(
      `Browser executable not found at "${override}" ` +
        "(set via MERMAID_MCP_EXECUTABLE_PATH / PUPPETEER_EXECUTABLE_PATH).",
    );
  }
  return systemBrowserCandidates(env).find((candidate) => existsSync(candidate));
}

const BROWSER_LAUNCH_HINTS = [
  "could not find",
  "failed to launch",
  "browser was not found",
  "executable doesn't exist",
  "no usable sandbox",
  "spawn",
  "enoent",
];

/** Whether an error looks like "the browser couldn't be found or launched". */
export function isBrowserLaunchError(err: unknown): boolean {
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return BROWSER_LAUNCH_HINTS.some((hint) => message.includes(hint));
}

/** Build an actionable error for when no browser could be launched. */
export function browserSetupError(original: unknown): Error {
  const detail = original instanceof Error ? original.message : String(original);
  return new Error(
    "Could not launch a Chromium-family browser to render the diagram. Fix any one of:\n" +
      "  - Install Google Chrome or Microsoft Edge (auto-detected), or\n" +
      "  - Download a bundled Chromium:  npx puppeteer browsers install chrome\n" +
      "  - Or set MERMAID_MCP_EXECUTABLE_PATH to a Chrome/Edge/Chromium binary.\n" +
      `Original error: ${detail}`,
  );
}
