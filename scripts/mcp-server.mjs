#!/usr/bin/env node

// MCP server exposing the HTML email decompiler + canonical newsletter build
// pipeline. Transport: stdio (works with Claude Code, Claude Desktop, Codex,
// or any MCP-aware client).
//
// Launch:
//   node /path/to/nfl-maizzle-mail/scripts/mcp-server.mjs
//
// Working directory: the server resolves its repo root from this script's
// location (../ relative to scripts/), so it does NOT matter what cwd the
// launching client sets. All path arguments to tools are resolved against
// that repo root unless absolute.
//
// Configuration:
//   - Reads .env from the repo root (via lib/decompiler/config.mjs).
//   - Honors DECOMPILER_* env vars (model, paths) — see lib/decompiler/config.mjs.
//   - Requires ANTHROPIC_API_KEY in .env for the decompile_email tool.

import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { buildAllTools } from '../lib/mcp/tools.mjs';
import { listResources, readResource } from '../lib/mcp/resources.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const server = new Server(
  {
    name: 'nfl-maizzle-mail',
    version: '0.2.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Tools and resources both need a way to send progress notifications back to
// the client when a long-running operation (decompile_email) makes incremental
// progress. We pass a `progress(percent?, message?)` function down into each
// handler via the tool/resource options.
const tools = buildAllTools({ repoRoot: REPO_ROOT, server });
const toolMap = new Map(tools.map((t) => [t.definition.name, t]));

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({
    name: t.definition.name,
    description: t.definition.description,
    inputSchema: t.definition.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args, _meta } = request.params;
  const tool = toolMap.get(name);
  if (!tool) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
    };
  }
  // If the client included a progress token, build a notifier the tool can
  // call as work progresses. MCP sends these as `notifications/progress`.
  const progressToken = _meta?.progressToken;
  const progress = progressToken
    ? async (progressValue, total, message) => {
        try {
          await server.notification({
            method: 'notifications/progress',
            params: {
              progressToken,
              progress: progressValue,
              ...(total != null ? { total } : {}),
              ...(message ? { message } : {}),
            },
          });
        } catch {
          // Notification delivery failures should never break the tool call.
        }
      }
    : undefined;

  try {
    return await tool.handler(args || {}, { progress });
  } catch (err) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `${name} failed: ${err?.message || String(err)}\n${err?.stack ? `\n${err.stack}` : ''}`,
        },
      ],
    };
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return listResources({ repoRoot: REPO_ROOT });
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  return readResource({ repoRoot: REPO_ROOT }, request.params.uri);
});

const transport = new StdioServerTransport();
await server.connect(transport);

// Server now runs until stdin closes. Log to stderr — stdout is the MCP
// transport channel, so anything we write there corrupts the protocol.
process.stderr.write(
  `[nfl-maizzle-mail MCP] ready. repo_root=${REPO_ROOT}, tools=${tools.length}\n`
);
