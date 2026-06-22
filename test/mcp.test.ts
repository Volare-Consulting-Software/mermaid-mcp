import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Spawn the server straight from TypeScript source via tsx, so `npm test`
// needs no prior build step.
let client: Client;
let transport: StdioClientTransport;

before(async () => {
  transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", "src/index.ts"],
  });
  client = new Client({ name: "mermaid-mcp-test", version: "0.0.0" });
  await client.connect(transport);
});

after(async () => {
  await client?.close();
});

test("exposes the render_mermaid tool", async () => {
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name);
  assert.ok(names.includes("render_mermaid"), `tools were: ${names.join(", ")}`);
});

test("render_mermaid returns inline PNG image content", { timeout: 60_000 }, async () => {
  const res = (await client.callTool({
    name: "render_mermaid",
    arguments: {
      diagram: "sequenceDiagram\n  Alice->>Bob: Hello\n  Bob-->>Alice: Hi",
      theme: "dark",
    },
  })) as { isError?: boolean; content: Array<{ type: string; mimeType?: string; data?: string }> };

  assert.notEqual(res.isError, true, "tool reported an error");
  const image = res.content.find((c) => c.type === "image");
  assert.ok(image, "expected image content in the tool result");
  assert.equal(image!.mimeType, "image/png");
  assert.ok((image!.data?.length ?? 0) > 0, "expected non-empty base64 image data");
});
