const $ = selector => document.querySelector(selector);
const labels = { pending: 'Not built', building: 'Building…', ready: 'Fresh build', warnings: 'Built with warnings', failed: 'Build failed', 'reference-only': 'Source reference', 'missing-sample': 'Needs a sample' };
let records = [];
let selected;
let width = 'desktop';
let view = 'build';

function choose(name) {
  selected = records.find(record => record.name === name) || records[0];
  if (!selected) return;
  history.replaceState(null, '', `#${selected.name}`);
  view = selected.preview ? 'build' : selected.reference ? 'reference' : 'build';
  renderList(); renderDetail();
}

function renderList() {
  const search = $('#search').value.toLowerCase();
  const stage = $('#filter').value;
  const matches = records.filter(record => (stage === 'all' || record.stage === stage) && `${record.name} ${record.description}`.toLowerCase().includes(search));
  const nav = $('#templates'); nav.replaceChildren();
  for (const record of matches) {
    const button = document.createElement('button'); button.type = 'button';
    button.setAttribute('aria-current', String(record.name === selected?.name));
    const title = document.createElement('strong'); title.textContent = record.name;
    const detail = document.createElement('small');
    const stageLabel = document.createElement('span'); stageLabel.textContent = record.stage;
    const state = document.createElement('span'); state.textContent = labels[record.status];
    detail.append(stageLabel, state); button.append(title, detail);
    button.addEventListener('click', () => choose(record.name)); nav.append(button);
  }
  if (!matches.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'No matching templates.'; nav.append(empty); }
}

function renderDetail() {
  if (!selected) return;
  $('#stage').textContent = selected.stage;
  $('#status').textContent = labels[selected.status]; $('#status').dataset.status = selected.status;
  $('#name').textContent = selected.name; $('#description').textContent = selected.description;
  $('#provenance').textContent = `Sample: ${selected.sample || 'No sample available'}\nOriginal: ${selected.referenceSource || 'No original email available'}\nBuilt: ${selected.builtAt ? new Date(selected.builtAt).toLocaleString() : 'No successful build'}\nRebuild: npm run gallery:build -- --template=${selected.name}`;
  $('#warnings').replaceChildren(...selected.warnings.map(warning => { const li = document.createElement('li'); li.textContent = warning; return li; }));
  for (const button of document.querySelectorAll('[data-width]')) button.setAttribute('aria-pressed', String(button.dataset.width === width));
  for (const button of document.querySelectorAll('[data-view]')) {
    button.setAttribute('aria-pressed', String(button.dataset.view === view));
    button.disabled = button.dataset.view === 'compare' ? !(selected.preview && selected.reference)
      : button.dataset.view === 'reference' ? !selected.reference : !selected.preview;
  }
  const message = $('#message');
  message.hidden = Boolean(selected.preview) && selected.status !== 'failed';
  message.textContent = selected.error ? `This template did not build.\n${selected.error}${selected.reference ? '\nThe original email is available below for reference.' : ''}`
    : selected.status === 'reference-only' ? 'Original email reference. There is no rendered reusable template sample yet.'
    : selected.status === 'building' ? 'A fresh sample is being built. This page refreshes automatically.'
    : 'No rendered sample yet. Run npm run gallery:build to generate the collection.';
  const canvas = $('#canvas'); canvas.className = `${width} ${view}`; canvas.replaceChildren();
  canvas.scrollTop = 0; canvas.scrollLeft = 0;
  const entries = view === 'compare' ? [['Sample build', selected.preview], ['Original email', selected.reference]]
    : [[view === 'reference' ? 'Original email' : 'Sample build', view === 'reference' ? selected.reference : selected.preview]];
  for (const [label, file] of entries) {
    if (!file) continue;
    const figure = document.createElement('figure'); figure.className = 'preview-panel';
    const caption = document.createElement('figcaption'); caption.textContent = `${label} / ${width === 'mobile' ? '390' : '800'} px`;
    const frame = document.createElement('iframe'); frame.title = `${selected.name} — ${label}`;
    frame.setAttribute('sandbox', ''); frame.referrerPolicy = 'no-referrer'; frame.src = `/previews/${file}`;
    figure.append(caption, frame); canvas.append(figure);
  }
  const current = view === 'reference' ? selected.reference : selected.preview;
  $('#open').hidden = !current; if (current) $('#open').href = `/previews/${current}`;
}

let lastManifest;
async function refresh() {
  try {
    const response = await fetch('/manifest.json');
    if (!response.ok) throw new Error('No gallery builds yet. Run npm run gallery:build, then refresh this page.');
    const manifest = await response.json();
    const serialized = JSON.stringify(manifest);
    if (serialized === lastManifest) return;
    lastManifest = serialized;
    records = manifest.templates;
    $('#count').textContent = `${records.length} templates · ${records.filter(record => record.preview).length} rendered samples`;
    $('#updated').textContent = `Collection updated ${new Date(manifest.generatedAt).toLocaleString()}`;
    if (!selected) choose(location.hash.slice(1) || 'dense-discovery');
    else { const previous = JSON.stringify(selected); selected = records.find(record => record.name === selected.name) || records[0]; renderList(); if (JSON.stringify(selected) !== previous) renderDetail(); }
  } catch (error) { $('#message').hidden = false; $('#message').textContent = error.message; }
}
$('#search').addEventListener('input', renderList);
$('#filter').addEventListener('change', renderList);
for (const button of document.querySelectorAll('[data-width]')) button.addEventListener('click', () => { width = button.dataset.width; renderDetail(); });
for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => { view = button.dataset.view; renderDetail(); });
window.addEventListener('hashchange', () => choose(location.hash.slice(1)));
refresh(); setInterval(refresh, 5000);
