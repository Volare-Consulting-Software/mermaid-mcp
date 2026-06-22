/**
 * Smoke test: render a sample diagram to a real PNG and verify it.
 * Run with `npm run smoke`. Writes ./tmp/smoke.png.
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { renderMermaidToPng } from "../src/render.js";

const DIAGRAM = `graph TD
  A[Mermaid markup] --> B{mmdc / puppeteer}
  B --> C[PNG]
  C --> D((MCP image content))`;

async function main() {
  const outDir = join(process.cwd(), "tmp");
  await mkdir(outDir, { recursive: true });
  const outputPath = join(outDir, "smoke.png");

  const result = await renderMermaidToPng({ diagram: DIAGRAM, outputPath, theme: "forest" });
  console.log(`OK: wrote ${result.bytes.length} bytes to ${result.path}`);

  const inline = await renderMermaidToPng({ diagram: DIAGRAM });
  console.log(`OK: inline render produced ${inline.bytes.length} bytes (isTemp=${inline.isTemp})`);
}

main().catch((err) => {
  console.error("SMOKE FAILED:", err);
  process.exit(1);
});
