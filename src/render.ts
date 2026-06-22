import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, isAbsolute } from "node:path";
import { run as mmdcRun } from "@mermaid-js/mermaid-cli";

export type MermaidTheme = "default" | "dark" | "forest" | "neutral";

export interface RenderOptions {
  /** Mermaid diagram source. */
  diagram: string;
  /** Absolute path to write the PNG to. When omitted, a temp file is used. */
  outputPath?: string;
  /** Mermaid theme. Defaults to "default". */
  theme?: MermaidTheme;
  /** Background color, e.g. "white", "transparent", "#ffffff". Defaults to "white". */
  backgroundColor?: string;
  /** Output width in pixels. */
  width?: number;
  /** Output height in pixels. */
  height?: number;
  /** Device scale factor (higher = sharper/larger PNG). Defaults to 1. */
  scale?: number;
}

export interface RenderResult {
  /** Path the PNG was written to. */
  path: string;
  /** Raw PNG bytes. */
  bytes: Buffer;
  /** True when the path is a throwaway temp file the caller may delete. */
  isTemp: boolean;
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

// Substrings that mean "Puppeteer couldn't find or launch a browser" (as opposed
// to a genuine diagram/syntax error, which we must not silently retry).
const BROWSER_LAUNCH_HINTS = [
  "could not find",
  "failed to launch",
  "browser was not found",
  "executable doesn't exist",
  "no usable sandbox",
  "spawn",
  "enoent",
];

function isBrowserLaunchError(err: unknown): boolean {
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return BROWSER_LAUNCH_HINTS.some((hint) => message.includes(hint));
}

function browserSetupError(original: unknown): Error {
  const detail = original instanceof Error ? original.message : String(original);
  return new Error(
    "Could not launch Chrome to render the diagram. Fix any one of:\n" +
      "  - Install Google Chrome, or run: npx puppeteer browsers install chrome\n" +
      "  - Or set PUPPETEER_EXECUTABLE_PATH to a Chrome/Chromium binary.\n" +
      `Original error: ${detail}`,
  );
}

/**
 * Render a Mermaid diagram to a PNG using @mermaid-js/mermaid-cli (Puppeteer/Chromium).
 *
 * The mermaid-cli programmatic API works off files, so the source is written to a
 * temporary `.mmd` file and the PNG is produced either at `outputPath` or in a temp dir.
 *
 * Puppeteer resolves the browser: the first attempt uses `PUPPETEER_EXECUTABLE_PATH`
 * (if set) or Puppeteer's bundled Chromium; if that can't launch, it falls back to a
 * system-installed Google Chrome (`channel: "chrome"`). No hardcoded paths.
 */
export async function renderMermaidToPng(opts: RenderOptions): Promise<RenderResult> {
  const diagram = opts.diagram?.trim();
  if (!diagram) {
    throw new Error("`diagram` is empty — provide Mermaid markup to render.");
  }
  if (opts.outputPath && !isAbsolute(opts.outputPath)) {
    throw new Error(`outputPath must be an absolute path, got: ${opts.outputPath}`);
  }
  if (opts.outputPath && !opts.outputPath.toLowerCase().endsWith(".png")) {
    throw new Error(`outputPath must end in .png, got: ${opts.outputPath}`);
  }

  const workDir = await mkdtemp(join(tmpdir(), "mermaid-mcp-"));
  const inputPath = join(workDir, "diagram.mmd");
  const isTemp = !opts.outputPath;
  const outputPath = opts.outputPath ?? join(workDir, "diagram.png");

  await writeFile(inputPath, diagram, "utf8");

  const parseMMDOptions = {
    backgroundColor: opts.backgroundColor ?? "white",
    mermaidConfig: { theme: opts.theme ?? "default" },
    viewport:
      opts.width || opts.height || opts.scale
        ? {
            width: opts.width ?? 800,
            height: opts.height ?? 600,
            deviceScaleFactor: opts.scale ?? 1,
          }
        : undefined,
  };

  const baseArgs = ["--no-sandbox", "--disable-setuid-sandbox"];
  // Browser sources tried in order, all resolved by Puppeteer itself.
  const puppeteerConfigs: Array<{ args: string[]; channel?: "chrome" }> = [
    { args: baseArgs }, // PUPPETEER_EXECUTABLE_PATH or Puppeteer's bundled Chromium
    { args: baseArgs, channel: "chrome" }, // system-installed Google Chrome
  ];

  try {
    let launchError: unknown;
    let rendered = false;
    for (const puppeteerConfig of puppeteerConfigs) {
      try {
        await mmdcRun(inputPath as `${string}.mmd`, outputPath as `${string}.png`, {
          quiet: true,
          puppeteerConfig,
          parseMMDOptions,
        });
        rendered = true;
        break;
      } catch (err) {
        if (!isBrowserLaunchError(err)) throw err; // genuine render/syntax error
        launchError = err; // browser source unavailable — try the next one
      }
    }
    if (!rendered) {
      throw browserSetupError(launchError);
    }

    const bytes = await readFile(outputPath);
    if (!bytes.subarray(0, 4).equals(PNG_MAGIC)) {
      throw new Error("Render produced a file that is not a valid PNG.");
    }
    return { path: outputPath, bytes, isTemp };
  } finally {
    // Clean up the scratch dir (the temp .mmd input, and the temp PNG when one was
    // used — its bytes are already in memory). A user-supplied outputPath lives
    // outside workDir and is left untouched.
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
