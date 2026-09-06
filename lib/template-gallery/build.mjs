import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { discoverTemplates, readJson, saveManifest, sourcePath } from './catalog.mjs';
import { inspectPreview } from './inspect.mjs';

const log = message => console.log(`[${new Date().toLocaleTimeString()}] ${message}`);

function runBuild(root, args, name) {
  return new Promise(resolve => {
    let output = '';
    const child = spawn(process.execPath, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    const capture = chunk => { output += chunk.toString(); };
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);
    const progress = setInterval(() => {
      const lines = output.replace(/\u001b\[[0-9;]*m/g, '').trim().split('\n');
      log(`${name}: ${lines.at(-1) || 'starting canonical build'}`);
    }, 5000);
    // The canonical builder owns restoration of data/newsletter.json. Let it finish
    // rather than terminating it halfway through its shared-data transaction.
    child.on('error', error => { output += `\n${error.message}`; });
    child.on('close', code => {
      clearInterval(progress);
      resolve({ code, output: output.replace(/\u001b\[[0-9;]*m/g, '') });
    });
  });
}

export async function buildGallery(root, cache, selected) {
  fs.mkdirSync(cache, { recursive: true });
  const lockPath = path.join(cache, '.build-lock');
  let lock;
  try { lock = fs.openSync(lockPath, 'wx'); }
  catch { throw new Error('A gallery build is already running. If it was interrupted, remove build_template_gallery/.build-lock before retrying.'); }
  try {
    let records = discoverTemplates(root);
    if (selected && !records.some(record => record.name === selected)) throw new Error(`Unknown template: ${selected}`);
    if (selected && fs.existsSync(path.join(cache, 'manifest.json'))) {
      const previous = readJson(path.join(cache, 'manifest.json')).templates;
      records = records.map(record => record.name === selected ? record : previous.find(item => item.name === record.name) || record);
    }
    saveManifest(root, cache, records);
    for (const record of records) {
      if (selected && record.name !== selected) continue;
      const folder = path.join(cache, record.name);
      fs.mkdirSync(folder, { recursive: true });
      // Never keep an old success URL attached to a failed rebuild.
      fs.rmSync(path.join(folder, 'preview.html'), { force: true });
      if (record.referenceSource) {
        fs.copyFileSync(sourcePath(root, record.referenceSource), path.join(folder, 'reference.html'));
        record.reference = `${record.name}/reference.html`;
      }
      if (!record.sample || !fs.existsSync(path.join(root, 'templates', record.name, 'newsletter.html'))) {
        record.status = record.reference ? 'reference-only' : 'missing-sample';
        log(`${record.name}: ${record.status}`);
        saveManifest(root, cache, records);
        continue;
      }
      record.status = 'building';
      saveManifest(root, cache, records);
      log(`${record.name}: building ${record.sample}`);
      try {
        const raw = fs.readFileSync(sourcePath(root, record.sample), 'utf8');
        const data = record.sample.endsWith('.json') ? JSON.parse(raw)
          : raw.trimStart().startsWith('---') ? matter(raw).data : yaml.load(raw);
        if (!data || typeof data !== 'object') throw new Error('Sample must contain newsletter data');
        const input = path.join(folder, 'input.json');
        fs.writeFileSync(input, JSON.stringify({ ...data, template: record.name }, null, 2));
        const correspondence = record.name === 'standard-correspondence';
        const args = [correspondence ? 'scripts/build-correspondence.mjs' : 'scripts/build-newsletter.mjs',
          input, 'preview', `--output-dir=${folder}`, '--no-open'];
        if (!correspondence) args.push(`--template=${record.name}`, '--preview', '--no-dark-mode-flatten');
        // Correspondence owns Markdown body parsing; pass its original source
        // rather than replacing it with frontmatter-only normalized JSON.
        if (correspondence) args[1] = sourcePath(root, record.sample);
        const { code, output } = await runBuild(root, args, record.name);
        fs.writeFileSync(path.join(folder, 'build.log'), output);
        record.warnings = output.split('\n').filter(line => /⚠|Schema validation found|\bWARN\b/i.test(line)).map(line => line.trim());
        if (code !== 0 || !fs.existsSync(path.join(folder, 'preview.html'))) {
          const failures = output.split('\n').filter(line => /❌|Error:|Build failed|ENOENT/i.test(line));
          throw new Error(failures.slice(-3).join('\n') || `Canonical build exited with code ${code}; see build.log`);
        }
        record.preview = `${record.name}/preview.html`;
        record.warnings.push(...inspectPreview(fs.readFileSync(path.join(folder, 'preview.html'), 'utf8')));
        record.builtAt = new Date().toISOString();
        record.status = record.warnings.length ? 'warnings' : 'ready';
      } catch (error) {
        record.status = 'failed';
        record.preview = null;
        record.error = error.message;
        fs.rmSync(path.join(folder, 'preview.html'), { force: true });
      }
      log(`${record.name}: ${record.status}${record.error ? ` — ${record.error}` : ''}`);
      saveManifest(root, cache, records);
    }
    const summary = records.reduce((counts, record) => ({ ...counts, [record.status]: (counts[record.status] || 0) + 1 }), {});
    log(`Gallery complete: ${JSON.stringify(summary)}`);
    return records;
  } finally {
    fs.closeSync(lock);
    fs.rmSync(lockPath, { force: true });
  }
}
