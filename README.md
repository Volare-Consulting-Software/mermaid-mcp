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
npm run build
```

## Browser requirement

Mermaid renders inside a real browser (it needs a DOM for layout), so a Chromium-family browser is
required. The server finds one automatically, in this order:

1. **`MERMAID_MCP_EXECUTABLE_PATH`** or **`PUPPETEER_EXECUTABLE_PATH`** — an explicit path you set.
2. **An installed system browser** — Google Chrome, Microsoft Edge, or Chromium, auto-detected at
   the usual locations for your OS. If you already have one of these, **nothing extra to download**.
3. **Puppeteer's bundled Chromium** — `@mermaid-js/mermaid-cli` downloads this during `npm install`
   as a fallback for machines with no browser.

If none can be launched, the tool returns an actionable error telling you to install Chrome/Edge,
run `npx puppeteer browsers install chrome`, or set `MERMAID_MCP_EXECUTABLE_PATH`.

> On some Windows machines Puppeteer's automatic Chromium download stalls mid-extraction. Having
> Chrome or Edge installed sidesteps it entirely (option 2 above). To repair a stalled download,
> delete the partial `%USERPROFILE%\.cache\puppeteer\chrome*\win64-*` folder and re-run
> `npx puppeteer browsers install chrome`.

## Test

```bash
npm test
```

Integration tests using Node's built-in test runner (`node:test`). They exercise the renderer
(input validation, inline render, render-to-file) and a full MCP stdio round-trip (spawn the server,
list tools, call `render_mermaid`). The render tests launch headless Chromium, so they need the
Chromium install above and take a few seconds each.

## Configure in an MCP client

After `npm run build`, point your MCP client at the built entry over stdio.

### Claude Code

```bash
# From a local build:
claude mcp add mermaid -- node /absolute/path/to/mermaid-mcp/dist/index.js

# Or from the published package:
claude mcp add mermaid -- npx -y @volare-consulting/mermaid-mcp
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

## Releasing

Published to the public npm registry as
[`@volare-consulting/mermaid-mcp`](https://www.npmjs.com/package/@volare-consulting/mermaid-mcp)
via a tag-driven GitHub Actions release (`.github/workflows/publish.yml`), which calls the org's
shared `publish-npm-public` reusable workflow.

1. Bump `version` in `package.json` on a PR and merge to `main`.
2. Tag the merge commit and push the tag:

   ```bash
   git tag v0.1.0 && git push origin v0.1.0
   ```

The tag **must** equal the `package.json` version or the job fails. Pushing a `v*` tag builds and
publishes the package (tests are skipped — they need headless Chromium the publish runner doesn't
provide). Authentication uses the org-level `NPM_TOKEN` secret.

## License

MIT
