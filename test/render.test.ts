import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderMermaidToPng } from "../src/render.js";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const SAMPLE = "graph TD\n  A[Start] --> B{Choice}\n  B --> C[End]";

function isPng(bytes: Buffer): boolean {
  return bytes.subarray(0, 4).equals(PNG_MAGIC);
}

// --- Validation: these reject before launching Chromium, so they're fast. ---

test("rejects empty diagram", async () => {
  await assert.rejects(() => renderMermaidToPng({ diagram: "   " }), /empty/i);
});

test("rejects a relative outputPath", async () => {
  await assert.rejects(
    () => renderMermaidToPng({ diagram: SAMPLE, outputPath: "out.png" }),
    /absolute/i,
  );
});

test("rejects an outputPath that is not .png", async () => {
  await assert.rejects(
    () => renderMermaidToPng({ diagram: SAMPLE, outputPath: join(tmpdir(), "out.svg") }),
    /\.png/i,
  );
});

// --- Happy paths: these launch Chromium, so allow a generous timeout. ---

test("renders inline to a temp PNG", { timeout: 60_000 }, async () => {
  const result = await renderMermaidToPng({ diagram: SAMPLE });
  assert.equal(result.isTemp, true);
  assert.ok(result.bytes.length > 0, "expected non-empty PNG bytes");
  assert.ok(isPng(result.bytes), "expected a valid PNG signature");
});

test("writes a PNG to a caller-supplied outputPath", { timeout: 60_000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), "mermaid-mcp-test-"));
  const outputPath = join(dir, "diagram.png");
  try {
    const result = await renderMermaidToPng({
      diagram: SAMPLE,
      outputPath,
      theme: "forest",
      backgroundColor: "transparent",
    });
    assert.equal(result.isTemp, false);
    assert.equal(result.path, outputPath);
    assert.ok(isPng(result.bytes));
    const onDisk = await stat(outputPath);
    assert.ok(onDisk.size > 0, "expected the PNG to exist on disk");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
