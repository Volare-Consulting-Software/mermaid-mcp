#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { renderMermaidToPng } from "./render.js";

const server = new McpServer({
  name: "mermaid-mcp",
  version: "0.1.0",
});

server.registerTool(
  "render_mermaid",
  {
    title: "Render Mermaid diagram to PNG",
    description:
      "Render Mermaid diagram markup to a PNG image. Returns the image inline so it " +
      "can be previewed. If `outputPath` (an absolute .png path) is provided, the PNG " +
      "is also saved there and the path is returned. Useful for turning AI-generated " +
      "Mermaid (flowcharts, sequence, class, ER, gantt, state diagrams, etc.) into images.",
    inputSchema: {
      diagram: z
        .string()
        .min(1)
        .describe("Mermaid diagram source, e.g. `graph TD; A-->B;`"),
      outputPath: z
        .string()
        .optional()
        .describe(
          "Absolute path ending in .png to save the image to. Omit to only return the image inline.",
        ),
      theme: z
        .enum(["default", "dark", "forest", "neutral"])
        .optional()
        .describe("Mermaid theme. Defaults to \"default\"."),
      backgroundColor: z
        .string()
        .optional()
        .describe('Background color, e.g. "white", "transparent", "#ffffff". Defaults to "white".'),
      width: z.number().int().positive().optional().describe("Output width in pixels."),
      height: z.number().int().positive().optional().describe("Output height in pixels."),
      scale: z
        .number()
        .positive()
        .optional()
        .describe("Device scale factor; higher = sharper/larger PNG. Defaults to 1."),
    },
  },
  async (args) => {
    try {
      const result = await renderMermaidToPng(args);
      const base64 = result.bytes.toString("base64");
      const summary = result.isTemp
        ? `Rendered Mermaid diagram inline (PNG, ${result.bytes.length} bytes).`
        : `Rendered Mermaid diagram to ${result.path} (PNG, ${result.bytes.length} bytes).`;

      return {
        content: [
          { type: "text" as const, text: summary },
          { type: "image" as const, data: base64, mimeType: "image/png" },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Failed to render Mermaid diagram: ${message}`,
          },
        ],
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mermaid-mcp server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in mermaid-mcp:", error);
  process.exit(1);
});
