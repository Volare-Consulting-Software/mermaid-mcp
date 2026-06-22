/**
 * End-to-end MCP test: spawn the built server over stdio, list tools, call render_mermaid.
 * Run with: npx tsx scripts/mcp-test.ts  (requires `npm run build` first)
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["dist/index.js"],
  });
  const client = new Client({ name: "mermaid-mcp-test", version: "0.0.0" });
  await client.connect(transport);

  const tools = await client.listTools();
  console.log("tools:", tools.tools.map((t) => t.name).join(", "));

  const res: any = await client.callTool({
    name: "render_mermaid",
    arguments: { diagram: "sequenceDiagram\n  Alice->>Bob: Hello\n  Bob-->>Alice: Hi", theme: "dark" },
  });
  const types = res.content.map((c: any) => c.type);
  const image = res.content.find((c: any) => c.type === "image");
  console.log("content types:", types.join(", "));
  console.log("isError:", res.isError ?? false);
  console.log("image mimeType:", image?.mimeType, "base64 len:", image?.data?.length);

  await client.close();
  if (!image || res.isError) {
    console.error("MCP TEST FAILED");
    process.exit(1);
  }
  console.log("MCP TEST OK");
}

main().catch((err) => {
  console.error("MCP TEST FAILED:", err);
  process.exit(1);
});
