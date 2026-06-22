# mermaid-mcp

An [MCP](https://modelcontextprotocol.io) server that renders [Mermaid](https://mermaid.js.org)
diagram markup to **PNG** images, using [`@mermaid-js/mermaid-cli`](https://github.com/mermaid-js/mermaid-cli)
(Puppeteer/Chromium) under the hood.

Give it AI-generated Mermaid — flowcharts, sequence, class, ER, gantt, state diagrams — and get
back a rendered image, returned inline so the host can preview it and/or written to a file on disk.

## Tool

### `render_mermaid`

| Parameter         | Type     | Required | Description |
| ----------------- | -------- | -------- | ----------- |
| `diagram`         | string   | yes      | Mermaid diagram source, e.g. `graph TD; A-->B;` |
| `outputPath`      | string   | no       | Absolute path ending in `.png` to also save the image to. Omit to only return inline. |
| `theme`           | enum     | no       | `default` \| `dark` \| `forest` \| `neutral` (default `default`) |
| `backgroundColor` | string   | no       | e.g. `white`, `transparent`, `#ffffff` (default `white`) |
| `width`           | number   | no       | Output width in pixels |
| `height`          | number   | no       | Output height in pixels |
| `scale`           | number   | no       | Device scale factor; higher = sharper/larger PNG (default `1`) |

Returns a short text summary plus the PNG as inline MCP `image` content. When `outputPath` is
supplied, the file is written there and the path is included in the summary.

## Install & build

```bash
npm install
npx puppeteer browsers install chrome   # download the headless Chromium used for rendering
npm run build
```

Rendering runs a headless Chromium via Puppeteer. If `npm install` doesn't fetch it automatically,
run `npx puppeteer browsers install chrome` (as above). It lands in Puppeteer's cache
(`~/.cache/puppeteer` / `%USERPROFILE%\.cache\puppeteer`). On Windows, if extraction stalls, delete
the partial `chrome/win64-*` folder and re-run the install.

## Smoke test

```bash
npm run smoke   # renders ./tmp/smoke.png and an inline render
```

## Configure in an MCP client

After `npm run build`, point your MCP client at the built entry over stdio.

### Claude Code

```bash
claude mcp add mermaid -- node /absolute/path/to/mermaid-mcp/dist/index.js
```

### Claude Desktop / generic `mcpServers` config

```json
{
  "mcpServers": {
    "mermaid": {
      "command": "node",
      "args": ["/absolute/path/to/mermaid-mcp/dist/index.js"]
    }
  }
}
```

## Development

```bash
npm run dev     # run the server from TypeScript source via tsx
```

## License

MIT
