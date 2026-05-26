# MCP setup — drive the decompiler and build pipeline from any LLM tool

This repo ships an [MCP server](https://modelcontextprotocol.io/) at `scripts/mcp-server.mjs` that exposes the HTML email decompiler and the canonical newsletter build pipeline as tools any MCP-aware LLM client can call. Once configured, you can say things like:

- "Decompile `emails-to-templatize/the-atlantic.html` for me."
- "List the templates I have."
- "Get the authoring guide for `new-yorker-sample` and walk me through writing today's issue."
- "Validate `content/2026-05-23.md` and then build it as the `weekly-issue-12` campaign."

…and the LLM will call the right tools without you running shell commands.

## Tools exposed

| Tool | Purpose |
|---|---|
| `decompile_email` | Run a full decompilation. Long-running (1-5 min); emits `notifications/progress` updates if the client supplied a `progressToken`. |
| `list_templates` | List installed templates with palette overview. |
| `get_template_schema` | Return the JSON schema for a template's data shape. |
| `get_template_authoring_guide` | Return AUTHORING.md (or a fallback summary if Phase A hasn't generated it yet). |
| `validate_newsletter_markdown` | Schema check a content/ markdown file before building. |
| `build_newsletter` | Run the canonical `build-newsletter.mjs` pipeline (link tracking, mobile font hardening, schema validation). |
| `add_section` | Insert a new section into an existing content Markdown file. Validates type against the palette; warns on missing/unknown slots. Use this for LLM-driven incremental authoring ("add an article_card_pair for this URL"). |

## Resources exposed

Per template installed under `templates/`, the server registers these URIs (visible via `resources/list`):

| URI pattern | What it returns |
|---|---|
| `nfl-maizzle-mail://template/<name>/authoring-guide` | `AUTHORING.md` if present, otherwise a synthesized fallback derived from the schema + decompilation report. |
| `nfl-maizzle-mail://template/<name>/section-styles` | `section-styles.json` (design tokens + mobile font lock). |
| `nfl-maizzle-mail://template/<name>/schema` | `newsletter.schema.json` (JSON Schema for the data shape). |
| `nfl-maizzle-mail://template/<name>/decompilation-report` | Raw decompilation report (only present for decompiler-generated templates). |

Resources let an LLM client cache these as static context rather than burning a tool call each time.

## Prerequisites

- Node 20+ (the repo uses ESM modules and the Anthropic SDK).
- The repo cloned somewhere on your machine. Note the absolute path — you'll need it for the config snippets below.
- `.env` populated with `ANTHROPIC_API_KEY` (required for `decompile_email`). Optional: `DECOMPILER_MODEL=claude-opus-4-7` (the validated default).
- `npm install` run once in the repo root.

The server resolves repo root from its own script location, so it does **not** matter what working directory your LLM client launches the subprocess from.

## Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent on your platform. Add an entry under `mcpServers`:

```json
{
  "mcpServers": {
    "nfl-maizzle-mail": {
      "command": "node",
      "args": [
        "/absolute/path/to/nfl-maizzle-mail/scripts/mcp-server.mjs"
      ]
    }
  }
}
```

Restart Claude Desktop. You should see the server's tools listed when you click the 🔧 (tools) icon at the bottom of a conversation.

## Claude Code

Two ways to configure depending on whether you want the server available globally or only inside this repo.

### Project-scoped (recommended)

Add to `.claude/settings.local.json` in your project (which can be this repo or any newsletter project that wants to talk to it):

```json
{
  "mcpServers": {
    "nfl-maizzle-mail": {
      "command": "node",
      "args": [
        "/absolute/path/to/nfl-maizzle-mail/scripts/mcp-server.mjs"
      ]
    }
  }
}
```

### User-global

Or add via the CLI for global access in every Claude Code session:

```bash
claude mcp add nfl-maizzle-mail node /absolute/path/to/nfl-maizzle-mail/scripts/mcp-server.mjs
```

Verify with `claude mcp list`.

## Codex (and other MCP clients)

Most MCP clients use the same `command` / `args` shape. Adapt the snippets above. The server speaks the MCP 2024-11-05 protocol over stdio.

## Smoke test (without an LLM client)

Send raw JSON-RPC to verify the server starts and responds:

```bash
cat <<'EOF' | node scripts/mcp-server.mjs
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_templates","arguments":{}}}
EOF
```

You should see (1) a `[nfl-maizzle-mail MCP] ready` line on stderr, (2) three JSON-RPC responses on stdout: protocol handshake, tool list, and a templates list.

## How an LLM session typically goes

Once configured, a non-technical user can say:

> "I want to set up a newsletter from this email."
> *(attaches or references `path/to/their-email.html`)*

The LLM will:

1. Call `decompile_email({html_path: "path/to/their-email.html"})` — wait 1-5 min while it runs.
2. Call `list_templates()` to confirm the new template appeared.
3. Call `get_template_authoring_guide({name: "their-email"})` to load the vocabulary into context.
4. Help the user iteratively build a new issue, validating with `validate_newsletter_markdown` before each build.
5. Call `build_newsletter({content_md_path: "content/2026-05-23.md", campaign_name: "weekly-12"})` to produce the shippable HTML.

## Troubleshooting

- **`ANTHROPIC_API_KEY not set`** — the server's `.env` is missing the key. The server reads `.env` from the repo root (where `scripts/mcp-server.mjs` lives, regardless of client cwd).
- **Server starts but `decompile_email` fails with "stream terminated"** — your `DECOMPILER_MODEL` is set to `claude-sonnet-4-20250514`. That model has a known issue with large tool inputs. Switch to `claude-opus-4-7` or `claude-sonnet-4-6`.
- **Tool output is huge** — that's expected; `decompile_email` returns the full palette + assignments. The LLM should summarize for you.
- **Stdout corruption / weird MCP errors** — make sure nothing in the pipeline writes to stdout. The server's own logs go to stderr; if you've added `console.log` somewhere, that will break the protocol.

## Source

- Entry point: [`scripts/mcp-server.mjs`](../scripts/mcp-server.mjs)
- Tool implementations: [`lib/mcp/tools.mjs`](../lib/mcp/tools.mjs)
- See also: [`docs/PRODUCT.md`](PRODUCT.md) for the three-phase workflow this server enables.
