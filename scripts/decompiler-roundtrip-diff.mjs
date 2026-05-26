#!/usr/bin/env node
// Compare a source email HTML against the decompiler's rebuilt HTML.
// Programmatic structural fidelity check: are image URLs, link URLs, headings
// preserved verbatim? Emits a JSON report + a human-readable summary.
//
// Usage:
//   node scripts/decompiler-roundtrip-diff.mjs <source.html> <rebuild.html> [--report=path]

import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node scripts/decompiler-roundtrip-diff.mjs <source.html> <rebuild.html> [--report=path]');
  process.exit(1);
}
const sourceFile = args[0];
const rebuildFile = args[1];
let reportPath;
for (const a of args.slice(2)) {
  if (a.startsWith('--report=')) reportPath = a.split('=')[1];
}

function inventory(html) {
  const doc = new JSDOM(html).window.document;
  const imgs = [...doc.querySelectorAll('img')].map((i) => normalizeUrl(i.getAttribute('src')));
  const links = [...doc.querySelectorAll('a[href]')].map((a) => normalizeUrl(a.getAttribute('href')));
  const headings = [...doc.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) =>
    h.textContent.replace(/\s+/g, ' ').trim()
  );
  const text = doc.body
    ? doc.body.textContent.replace(/\s+/g, ' ').trim()
    : doc.documentElement.textContent.replace(/\s+/g, ' ').trim();
  const tagCounts = {};
  for (const n of doc.querySelectorAll('*')) {
    const t = n.tagName.toLowerCase();
    tagCounts[t] = (tagCounts[t] || 0) + 1;
  }
  return { imgs: dedupe(imgs), links: dedupe(links), headings, tagCounts, textLength: text.length };
}

function normalizeUrl(u) {
  if (!u) return '';
  return u.trim();
}

function dedupe(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function diffSets(sourceSet, rebuildSet) {
  const source = new Set(sourceSet);
  const rebuild = new Set(rebuildSet);
  const onlyInSource = [...source].filter((x) => !rebuild.has(x));
  const onlyInRebuild = [...rebuild].filter((x) => !source.has(x));
  const inBoth = [...source].filter((x) => rebuild.has(x));
  return {
    sourceCount: source.size,
    rebuildCount: rebuild.size,
    inBoth: inBoth.length,
    onlyInSource,
    onlyInRebuild,
    preserved: source.size > 0 ? inBoth.length / source.size : 1,
  };
}

const source = inventory(fs.readFileSync(sourceFile, 'utf8'));
const rebuild = inventory(fs.readFileSync(rebuildFile, 'utf8'));

const report = {
  source: { file: sourceFile, ...source },
  rebuild: { file: rebuildFile, ...rebuild },
  diffs: {
    images: diffSets(source.imgs, rebuild.imgs),
    links: diffSets(source.links, rebuild.links),
    headings: diffSets(source.headings, rebuild.headings),
  },
};

const pct = (n) => (n * 100).toFixed(0) + '%';
const w = (s, n) => String(s).padEnd(n);

console.log('');
console.log(`Source:   ${sourceFile}  (${source.textLength.toLocaleString()} chars text, ${source.imgs.length} imgs, ${source.links.length} links)`);
console.log(`Rebuild:  ${rebuildFile}  (${rebuild.textLength.toLocaleString()} chars text, ${rebuild.imgs.length} imgs, ${rebuild.links.length} links)`);
console.log('');
console.log(`${w('', 12)} ${w('source', 8)} ${w('rebuild', 8)} ${w('preserved', 10)} ${w('extra', 6)}`);
for (const [name, d] of Object.entries(report.diffs)) {
  console.log(
    `${w(name, 12)} ${w(d.sourceCount, 8)} ${w(d.rebuildCount, 8)} ${w(pct(d.preserved) + ` (${d.inBoth}/${d.sourceCount})`, 18)} ${w(d.onlyInRebuild.length, 6)}`
  );
}

if (report.diffs.images.onlyInSource.length) {
  console.log('');
  console.log(`Missing images (${report.diffs.images.onlyInSource.length}):`);
  for (const u of report.diffs.images.onlyInSource.slice(0, 10)) console.log(`  - ${u}`);
  if (report.diffs.images.onlyInSource.length > 10) console.log(`  ... +${report.diffs.images.onlyInSource.length - 10} more`);
}
if (report.diffs.links.onlyInSource.length) {
  console.log('');
  console.log(`Missing links (${report.diffs.links.onlyInSource.length}):`);
  for (const u of report.diffs.links.onlyInSource.slice(0, 10)) console.log(`  - ${u}`);
  if (report.diffs.links.onlyInSource.length > 10) console.log(`  ... +${report.diffs.links.onlyInSource.length - 10} more`);
}
if (report.diffs.headings.onlyInSource.length) {
  console.log('');
  console.log(`Missing headings (${report.diffs.headings.onlyInSource.length}):`);
  for (const h of report.diffs.headings.onlyInSource.slice(0, 10)) console.log(`  - "${h.slice(0, 80)}"`);
}

if (reportPath) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('');
  console.log(`Full report: ${reportPath}`);
}
