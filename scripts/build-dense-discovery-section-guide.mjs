#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(repoRoot, 'templates', 'dense-discovery', 'section-guide.md');
const outputName = 'dense-discovery-section-guide';
const builtHtmlPath = path.join(repoRoot, 'build_production', `${outputName}.html`);
const guideHtmlPath = path.join(repoRoot, 'build_production', `${outputName}-schematic.html`);

const aliasNoteByType = {
  sponsor: 'Legacy alias rendered by the same branch as feature.',
  image: 'Alias rendered by the same branch as animated-image.',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

function collectLeafPaths(value, prefix = '') {
  if (Array.isArray(value)) {
    if (value.length === 0) return [prefix];
    return value.flatMap((entry, index) => collectLeafPaths(entry, `${prefix}[${index}]`));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return [prefix];
    return entries.flatMap(([key, entry]) => collectLeafPaths(entry, prefix ? `${prefix}.${key}` : key));
  }

  return [prefix];
}

function getSectionDisplayText(section) {
  if (section.type === 'microdrop-product-launch' || section.type === 'microdrop-institution-service') {
    return section.hero?.headline || section.title;
  }
  return section.title || section.rubric || section.type;
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getBodyRows(html) {
  const dom = new JSDOM(html);
  const bodyTable = dom.window.document.querySelector('table.body');
  if (!bodyTable) {
    throw new Error('Could not find compiled email body table');
  }

  const tbody = bodyTable.querySelector(':scope > tbody');
  if (!tbody) {
    throw new Error('Could not find compiled email body table rows');
  }

  return Array.from(tbody.children).filter((node) => node.tagName.toLowerCase() === 'tr');
}

function rowContainsText(row, text) {
  return normalizeText(row.textContent).includes(normalizeText(text));
}

function trimTrailingEmptyRows(rows) {
  const trimmed = [...rows];
  while (trimmed.length > 1 && normalizeText(trimmed[trimmed.length - 1].textContent) === '') {
    trimmed.pop();
  }
  return trimmed;
}

function extractCompiledSections(html, sections) {
  const rows = getBodyRows(html);
  let searchFrom = 0;

  const starts = sections.map((section) => {
    const displayText = getSectionDisplayText(section);
    const startIndex = rows.findIndex((row, index) => index >= searchFrom && rowContainsText(row, displayText));
    if (startIndex === -1) {
      throw new Error(`Could not find compiled row for section "${section.type}" using text "${displayText}"`);
    }
    searchFrom = startIndex + 1;
    return startIndex;
  });

  return sections.map((section, index) => {
    const start = starts[index];
    const end = index + 1 < starts.length ? starts[index + 1] : rows.length;
    const sectionRows = trimTrailingEmptyRows(rows.slice(start, end));
    return {
      section,
      html: sectionRows.map((row) => row.outerHTML).join('\n'),
    };
  });
}

function buildSectionFrame(sectionHtml) {
  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<style>body{margin:0;background:#fff;} table{max-width:640px;} img{max-width:100%;height:auto;}</style>',
    '</head>',
    '<body>',
    '<table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-spacing:0;width:100%;max-width:640px;margin:0 auto;"><tbody>',
    sectionHtml,
    '</tbody></table>',
    '</body>',
    '</html>',
  ].join('');
}

function buildGuideHtml({ builtHtml, sections }) {
  const compiledSections = extractCompiledSections(builtHtml, sections);
  const cards = compiledSections.map(({ section, html: sectionHtml }, index) => {
    const snippet = `sections:\n${yaml.dump([section], {
      lineWidth: 1000,
      noRefs: true,
      sortKeys: false,
    }).split('\n').map((line) => `  ${line}`).join('\n').trimEnd()}\n`;
    const paths = collectLeafPaths(section).filter(Boolean);
    const srcdoc = buildSectionFrame(sectionHtml);
    const aliasNote = aliasNoteByType[section.type]
      ? `<p class="alias-note">${escapeHtml(aliasNoteByType[section.type])}</p>`
      : '';

    return `
      <article class="section-card" id="section-${escapeAttribute(section.type)}">
        <header class="section-card-header">
          <div>
            <p class="eyebrow">Section ${index + 1}</p>
            <h2>${escapeHtml(section.type)}</h2>
            ${aliasNote}
          </div>
          <a href="#top">Top</a>
        </header>
        <div class="section-grid">
          <section class="markdown-pane" aria-labelledby="markdown-${index}">
            <h3 id="markdown-${index}">Authored Markdown Frontmatter</h3>
            <pre><code>${escapeHtml(snippet)}</code></pre>
          </section>
          <section class="attributes-pane" aria-labelledby="attributes-${index}">
            <h3 id="attributes-${index}">Authored Elements</h3>
            <ul>
              ${paths.map((fieldPath) => `<li><code>${escapeHtml(fieldPath)}</code></li>`).join('\n')}
            </ul>
          </section>
          <section class="render-pane" aria-labelledby="render-${index}">
            <h3 id="render-${index}">Rendered HTML Output</h3>
            <iframe title="${escapeAttribute(section.type)} rendered output" srcdoc="${escapeAttribute(srcdoc)}"></iframe>
          </section>
        </div>
      </article>
    `;
  }).join('\n');

  const navItems = sections.map((section) =>
    `<a href="#section-${escapeAttribute(section.type)}">${escapeHtml(section.type)}</a>`
  ).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dense Discovery Section Guide</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f5f7;
      --surface: #ffffff;
      --text: #172033;
      --muted: #657084;
      --line: #d7dce5;
      --accent: #2057a8;
      --code-bg: #111827;
      --code-text: #e5edf8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    main {
      width: min(1480px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 28px 0 48px;
    }
    .intro {
      margin: 0 0 20px;
      padding: 0;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 28px;
      line-height: 1.15;
      letter-spacing: 0;
    }
    .intro p {
      max-width: 920px;
      margin: 0 0 12px;
      color: var(--muted);
      font-size: 15px;
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 18px 0 24px;
    }
    nav a,
    .section-card-header a {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 6px 10px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
    }
    .section-card {
      margin: 0 0 28px;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    .section-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 20px;
      border-bottom: 1px solid var(--line);
      background: #fbfcfe;
    }
    .eyebrow {
      margin: 0 0 4px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    h2 {
      margin: 0;
      font-size: 22px;
      line-height: 1.2;
      letter-spacing: 0;
    }
    .alias-note {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 13px;
    }
    .section-grid {
      display: grid;
      grid-template-columns: minmax(320px, 0.95fr) minmax(240px, 0.55fr) minmax(420px, 1fr);
      gap: 0;
      align-items: stretch;
    }
    .markdown-pane,
    .attributes-pane,
    .render-pane {
      min-width: 0;
      padding: 16px;
    }
    .markdown-pane,
    .attributes-pane {
      border-right: 1px solid var(--line);
    }
    h3 {
      margin: 0 0 10px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.3;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    pre {
      height: 520px;
      margin: 0;
      padding: 14px;
      overflow: auto;
      border-radius: 6px;
      background: var(--code-bg);
      color: var(--code-text);
      font-size: 12px;
      line-height: 1.45;
      tab-size: 2;
      white-space: pre;
    }
    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      letter-spacing: 0;
    }
    ul {
      height: 520px;
      margin: 0;
      padding: 12px 12px 12px 28px;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fbfcfe;
    }
    li {
      margin: 0 0 6px;
      color: var(--muted);
      font-size: 12px;
    }
    li code {
      color: var(--text);
      overflow-wrap: anywhere;
    }
    iframe {
      display: block;
      width: 100%;
      height: 520px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
    }
    @media (max-width: 1160px) {
      .section-grid {
        grid-template-columns: 1fr;
      }
      .markdown-pane,
      .attributes-pane {
        border-right: 0;
        border-bottom: 1px solid var(--line);
      }
      pre,
      ul,
      iframe {
        height: 420px;
      }
    }
  </style>
</head>
<body>
  <main id="top">
    <section class="intro">
      <h1>Dense Discovery Section Guide</h1>
      <p>This guide is generated from <code>templates/dense-discovery/section-guide.md</code> by running the repository's canonical newsletter build. The rendered panes are extracted from <code>${escapeHtml(path.relative(repoRoot, builtHtmlPath))}</code>, so they reflect the HTML after frontmatter parsing, normalization, style injection, ad hydration, and Maizzle rendering.</p>
      <p>Each card shows the authored YAML for one <code>sections</code> entry, the leaf fields used as authored elements, and the corresponding rendered section fragment inside a 640px email table.</p>
    </section>
    <nav aria-label="Section types">${navItems}</nav>
    ${cards}
  </main>
</body>
</html>
`;
}

function runBuild() {
  const result = spawnSync(process.execPath, [
    path.join(repoRoot, 'scripts', 'build-newsletter.mjs'),
    sourcePath,
    outputName,
    '--no-open',
  ], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`Newsletter build failed with exit code ${result.status}`);
  }
}

function main() {
  console.log('Building dense-discovery section guide source...');
  runBuild();

  const sourceRaw = fs.readFileSync(sourcePath, 'utf8');
  const { data } = matter(sourceRaw);
  const sections = Array.isArray(data.sections) ? data.sections : [];
  if (sections.length === 0) {
    throw new Error(`No sections found in ${sourcePath}`);
  }

  const builtHtml = fs.readFileSync(builtHtmlPath, 'utf8');
  const guideHtml = buildGuideHtml({ builtHtml, sections });
  fs.writeFileSync(guideHtmlPath, guideHtml, 'utf8');

  console.log(`Wrote ${path.relative(repoRoot, guideHtmlPath)}`);
}

main();
