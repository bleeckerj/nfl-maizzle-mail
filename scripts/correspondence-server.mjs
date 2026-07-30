#!/usr/bin/env node

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCorrespondenceEmail } from './build-correspondence.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

export function createCorrespondenceServer({ repoRoot = DEFAULT_REPO_ROOT, token = process.env.CORRESPONDENCE_RENDER_TOKEN || '' } = {}) {
  return http.createServer(async (request, response) => {
    if (request.method !== 'POST' || new URL(request.url || '/', 'http://localhost').pathname !== '/render/correspondence') {
      return sendJson(response, 404, { error: 'Not found' });
    }
    if (!token || request.headers.authorization !== 'Bearer ' + token) {
      return sendJson(response, 401, { error: 'Unauthorized' });
    }

    try {
      const payload = JSON.parse(await readBody(request));
      const rendered = await renderCorrespondencePayload(payload, { repoRoot });
      return sendJson(response, 200, rendered);
    } catch (error) {
      console.error('correspondence render failed', error);
      return sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
  });
}

export async function renderCorrespondencePayload(payload, { repoRoot = DEFAULT_REPO_ROOT } = {}) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nfl-correspondence-http-'));
  const inputPath = path.join(tempRoot, 'correspondence.json');
  const outputDir = path.join(tempRoot, 'output');
  fs.writeFileSync(inputPath, JSON.stringify(payload), 'utf8');
  try {
    const result = await buildCorrespondenceEmail({
      args: [inputPath, 'http-correspondence', '--repo-root=' + repoRoot, '--output-dir=' + outputDir, '--no-open'],
      openPreview: false,
      logger: { log() {}, warn() {} },
    });
    const htmlBody = fs.readFileSync(result.finalOutputPath, 'utf8');
    const textBody = htmlToText(htmlBody);
    return {
      template: result.templateName,
      subject: result.data.subject,
      htmlBody,
      textBody,
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) { request.destroy(new Error('Request body too large.')); reject(new Error('Request body too large.')); }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function htmlToText(html) {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  response.end(body);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.CORRESPONDENCE_RENDER_PORT || 8789);
  const server = createCorrespondenceServer();
  server.listen(port, () => console.log('Correspondence renderer listening on ' + port));
}
