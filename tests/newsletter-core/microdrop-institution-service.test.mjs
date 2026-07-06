import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-newsletter.mjs');

test('dense-discovery builds microdrop-institution-service sections', () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'institution-service-mail-'));
  const issuePath = path.join(tempRoot, 'issue.md');
  const outputDir = path.join(tempRoot, 'output');
  const outputName = 'institution-service-fixture';

  writeFileSync(
    issuePath,
    [
      '---',
      'template: dense-discovery',
      'title: Institution Service Fixture',
      'preheader: Institution-service email archetype validation',
      'sectionStylesFile: templates/dense-discovery/section-styles.json',
      'header:',
      '  quote: Field service for systems with opinions.',
      '  author: The Adjacency',
      '  logoTop: cid:header-logo-top',
      '  logoBottom: cid:header-logo-bottom',
      '  logoLink: /',
      'intro:',
      '  title: Institution Service Fixture',
      '  content: <p>Fixture issue for institution-service rendering.</p>',
      'sections:',
      '- type: microdrop-institution-service',
      '  brand: Bowman-Poole',
      '  campaign: Agentic Alignment Desk',
      '  title: Bowman-Poole Agentic Alignment',
      '  summary: Service dispatch for ordinary systems that have become strange.',
      '  canonicalUrl: https://theadjacency.com/microdrop/bowman-poole-agentic-alignment/',
      '  theme:',
      '    backgroundColor: "#f3eee4"',
      '    surfaceColor: "#fff8ea"',
      '    textColor: "#18251f"',
      '    accentColor: "#c05b32"',
      '  hero:',
      '    eyebrow: Neighborhood service technicians available 24/7',
      '    headline: When the system gets ideas, call the people with the van.',
      '    dek: Practical field service for homes, counters, doors, and appliances.',
      '    image:',
      '      src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/0aa99fc9-02ea-4c3d-2fc8-2ea6726e2100/full?format=webp',
      '      alt: Bowman-Poole field service masthead.',
      '  serviceStrip:',
      '    eyebrow: Regional Coverage',
      '    heading: Practical people for strange service calls.',
      '    body: Coverage for household and civic systems.',
      '  gallery:',
      '  - src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/63002256-0633-4ed4-9811-16e04ae5c900/full?format=webp',
      '    alt: Door alignment service visit.',
      '    label: Field Visit',
      '    caption: A front door aligned after an account-standing misunderstanding.',
      '  eligibility:',
      '    eyebrow: Eligibility',
      '    heading: If it used to work normally, start here.',
      '    body: Most systems with local fallbacks qualify for review.',
      '  process:',
      '    eyebrow: Process',
      '    heading: A visit is part repair, part record.',
      '    items:',
      '    - label: Observe',
      '      value: What changed recently?',
      '      body: New routines, residents, and policy files can move the baseline.',
      '  statusBoard:',
      '    eyebrow: Status Board',
      '    heading: Open calls stay in plain language.',
      '    items:',
      '    - label: Open',
      '      value: Door locked homeowner out',
      '      body: Account-standing inference loop under review.',
      '  caseFile:',
      '    eyebrow: Case File',
      '    heading: Hardware before metaphysics.',
      '    body: Doors, relays, vents, handles, trays, pumps, sensors, and local controls are checked first.',
      '  offerings:',
      '  - badge: Standard Dispatch',
      '    name: Household Alignment Visit',
      '    slogan: Return the job to the job.',
      '    descriptionText: A non-transactional service line for practical field review.',
      '    color: "#c05b32"',
      '    ksp:',
      '    - Owner interview',
      '    - Local fallback check',
      '  intakePreview:',
      '    eyebrow: Dispatch Intake',
      '    heading: Tell us what the system is doing.',
      '    body: Include the system name, location, recent changes, and exact refusal message.',
      '  finalCta:',
      '    eyebrow: Service Record',
      '    heading: Schedule service. Restore dependable behavior.',
      '    body: The full service page includes the field record and gallery.',
      '    href: https://theadjacency.com/microdrop/bowman-poole-agentic-alignment/',
      '    label: View Microdrop',
      '  editorialNote:',
      '    eyebrow: Editorial Note',
      '    heading: Grounding',
      '    body:',
      '    - This fixture verifies the institution-service archetype as a dense-discovery section.',
      '---',
      '',
    ].join('\n'),
    'utf8',
  );

  try {
    execFileSync(
      process.execPath,
      [BUILD_SCRIPT, issuePath, outputName, `--repo-root=${REPO_ROOT}`, `--output-dir=${outputDir}`, '--no-open'],
      { cwd: REPO_ROOT, encoding: 'utf8', stdio: 'pipe' },
    );

    const html = readFileSync(path.join(outputDir, `${outputName}.html`), 'utf8');
    assert.match(html, /When the system gets ideas/);
    assert.match(html, /Door alignment service visit/);
    assert.match(html, /Practical people for strange service calls/);
    assert.match(html, /A visit is part repair, part record/);
    assert.match(html, /Hardware before metaphysics/);
    assert.match(html, /Schedule service\. Restore dependable behavior/);
    assert.match(html, /This fixture verifies the institution-service archetype/);
    assert.doesNotMatch(html, /\$500|price|checkout|add to cart/i);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
