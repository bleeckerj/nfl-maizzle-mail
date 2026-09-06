#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGallery } from '../lib/template-gallery/build.mjs';
import { createGalleryServer } from '../lib/template-gallery/server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(root, 'build_template_gallery');
const [command = 'serve', ...options] = process.argv.slice(2);
const selected = options.find(option => option.startsWith('--template='))?.slice('--template='.length);
if (command === 'build') {
  await buildGallery(root, cache, selected);
} else if (command === 'serve') {
  const port = Number(options.find(option => option.startsWith('--port='))?.slice('--port='.length) || 4319);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
  const server = createGalleryServer(root, cache);
  server.on('error', error => { console.error(`Gallery server: ${error.message}`); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Template gallery: http://127.0.0.1:${port}\nRefresh previews with npm run gallery:build`));
} else {
  throw new Error('Usage: template-gallery.mjs build [--template=name] | serve [--port=4319]');
}
