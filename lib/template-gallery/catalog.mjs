import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';

export function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

export function validateDocument(root, filename, value) {
  const validate = new Ajv({ allErrors: true }).compile(readJson(path.join(root, 'gallery', filename)));
  if (!validate(value)) throw new Error(`${filename}: ${JSON.stringify(validate.errors)}`);
  return value;
}

export function sourcePath(root, relative) {
  const editorial = relative.startsWith('editorial:');
  const allowedRoot = editorial ? path.resolve(root, '../nfl-editorial/emails') : path.resolve(root);
  const relativePath = editorial ? relative.slice('editorial:'.length) : relative;
  const resolved = path.resolve(allowedRoot, relativePath);
  if (!resolved.startsWith(`${allowedRoot}${path.sep}`)) throw new Error('Gallery sources must stay inside the repository or configured editorial emails root');
  if (fs.existsSync(resolved) && !fs.realpathSync(resolved).startsWith(`${fs.realpathSync(allowedRoot)}${path.sep}`)) {
    throw new Error('Gallery sources cannot follow symlinks outside their source root');
  }
  return resolved;
}

export function discoverTemplates(root) {
  const config = validateDocument(root, 'config.schema.json', readJson(path.join(root, 'gallery/config.json')));
  return fs.readdirSync(path.join(root, 'templates'), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^[a-z0-9][a-z0-9-]*$/.test(entry.name))
    .map(({ name }) => {
      const metadata = config.templates[name] || { stage: 'prototype', description: 'New template; review its sample and development status.' };
      const candidates = metadata.sample ? [metadata.sample] : [
        `templates/${name}/sample-content.md`, `templates/${name}/sample-data.json`,
        `content/${name}-source.md`, `templates/${name}/skeleton.md`,
      ];
      const sample = candidates.find(file => fs.existsSync(sourcePath(root, file))) || null;
      const referenceSource = metadata.reference && fs.existsSync(sourcePath(root, metadata.reference)) ? metadata.reference : null;
      return { name, stage: metadata.stage, description: metadata.description, sample, referenceSource,
        status: 'pending', preview: null, reference: null, builtAt: null, warnings: [], error: null };
    });
}

export function saveManifest(root, cache, templates) {
  const manifest = validateDocument(root, 'manifest.schema.json', { generatedAt: new Date().toISOString(), templates });
  const target = path.join(cache, 'manifest.json');
  fs.writeFileSync(`${target}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.renameSync(`${target}.tmp`, target);
}
