import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

export const MOBILE_TYPOGRAPHY_LEDGER_PATH = path.join(
  'config',
  'mobile-typography-locks.jsonl',
);
const REQUIRED_LOCKED_TEMPLATES = new Set(['dense-discovery']);

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }

  return value;
}

export function computeMobileTypographyEntryHash(entry) {
  const { hash: _storedHash, ...payload } = entry;
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(stableValue(payload)))
    .digest('hex');
}

export function loadMobileTypographyLedger(repoRoot) {
  const ledgerPath = path.join(repoRoot, MOBILE_TYPOGRAPHY_LEDGER_PATH);
  const ledgerRaw = fs.readFileSync(ledgerPath, 'utf8');
  assertLedgerExtendsGitParent(repoRoot, ledgerRaw);
  const lines = ledgerRaw
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trimStart().startsWith('#'));
  const entries = lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(
        `Invalid mobile typography ledger JSON on line ${index + 1}: ${error.message}`,
      );
    }
  });

  const latestHashByTemplate = new Map();
  const latestSequenceByTemplate = new Map();

  entries.forEach((entry, index) => {
    const lineNumber = index + 1;
    if (!entry.template || !Number.isInteger(entry.sequence)) {
      throw new Error(
        `Mobile typography ledger line ${lineNumber} requires template and integer sequence`,
      );
    }

    const expectedSequence = (latestSequenceByTemplate.get(entry.template) || 0) + 1;
    if (entry.sequence !== expectedSequence) {
      throw new Error(
        `Mobile typography ledger ${entry.template} sequence ${entry.sequence} should be ${expectedSequence}`,
      );
    }

    const expectedPreviousHash = latestHashByTemplate.get(entry.template) || null;
    if (entry.previousHash !== expectedPreviousHash) {
      throw new Error(
        `Mobile typography ledger ${entry.template} sequence ${entry.sequence} breaks the append-only hash chain`,
      );
    }

    const computedHash = computeMobileTypographyEntryHash(entry);
    if (entry.hash !== computedHash) {
      throw new Error(
        `Mobile typography ledger ${entry.template} sequence ${entry.sequence} has been edited in place`,
      );
    }

    latestHashByTemplate.set(entry.template, entry.hash);
    latestSequenceByTemplate.set(entry.template, entry.sequence);
  });

  return { ledgerPath, entries };
}

function assertLedgerExtendsGitParent(repoRoot, ledgerRaw) {
  ['HEAD', 'HEAD^'].forEach((gitRef) => {
    let committedLedgerRaw;
    try {
      committedLedgerRaw = execFileSync(
        'git',
        ['show', `${gitRef}:${MOBILE_TYPOGRAPHY_LEDGER_PATH}`],
        {
          cwd: repoRoot,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        },
      );
    } catch {
      // The ledger is new at this ref, or the checkout has no accessible
      // parent (for example, a depth-one clone). The hash chain still applies.
      return;
    }

    const committedPrefix = committedLedgerRaw.endsWith('\n')
      ? committedLedgerRaw
      : `${committedLedgerRaw}\n`;
    if (ledgerRaw !== committedLedgerRaw && !ledgerRaw.startsWith(committedPrefix)) {
      throw new Error(
        'Mobile typography ledger is write-once: committed records may not be edited or removed; append a new hash-chained record',
      );
    }
  });
}

export function getLatestMobileTypographyLock(repoRoot, templateName) {
  const ledgerPath = path.join(repoRoot, MOBILE_TYPOGRAPHY_LEDGER_PATH);
  if (!fs.existsSync(ledgerPath)) {
    const isRealCheckout = fs.existsSync(path.join(repoRoot, '.git'));
    if (isRealCheckout && REQUIRED_LOCKED_TEMPLATES.has(templateName)) {
      throw new Error(
        `${templateName} requires the write-once mobile typography ledger at ${ledgerPath}`,
      );
    }
    return { ledgerPath, entry: null };
  }

  const { entries } = loadMobileTypographyLedger(repoRoot);
  const matchingEntries = entries.filter((entry) => entry.template === templateName);
  return {
    ledgerPath,
    entry: matchingEntries.at(-1) || null,
  };
}

function normalizeSelector(selector) {
  return selector
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(',')
    .map((part) => part.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .join(',');
}

function extractMediaQueryBody(css, breakpoint) {
  const mediaPattern = new RegExp(
    `@media\\s+screen\\s+and\\s*\\(max-width\\s*:\\s*${breakpoint.replace('.', '\\.')}\\s*\\)`,
    'i',
  );
  const match = mediaPattern.exec(css);
  if (!match) {
    throw new Error(`Missing mobile media query for max-width ${breakpoint}`);
  }

  const openingBrace = css.indexOf('{', match.index + match[0].length);
  if (openingBrace === -1) {
    throw new Error(`Malformed mobile media query for max-width ${breakpoint}`);
  }

  let depth = 1;
  for (let index = openingBrace + 1; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') depth -= 1;
    if (depth === 0) {
      return css.slice(openingBrace + 1, index);
    }
  }

  throw new Error(`Unclosed mobile media query for max-width ${breakpoint}`);
}

function parseDeclarations(body) {
  return Object.fromEntries(
    body
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => {
        const colonIndex = declaration.indexOf(':');
        if (colonIndex === -1) return [declaration, ''];
        return [
          declaration.slice(0, colonIndex).trim().toLowerCase(),
          normalizeDeclarationValue(declaration.slice(colonIndex + 1)),
        ];
      }),
  );
}

function normalizeDeclarationValue(value) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*!important\b/i, ' !important');
}

function expectedValues(expectedValue) {
  return Array.isArray(expectedValue) ? expectedValue : [expectedValue];
}

function matchesExpectedDeclaration(actualValue, expectedValue) {
  return expectedValues(expectedValue).some(
    (candidate) => actualValue === normalizeDeclarationValue(candidate),
  );
}

function formatExpectedValues(expectedValue) {
  return expectedValues(expectedValue).map((value) => `"${value}"`).join(' or ');
}

function parseCssRules(css) {
  const rules = new Map();
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;

  while ((match = rulePattern.exec(css)) !== null) {
    const declarations = parseDeclarations(match[2]);
    normalizeSelector(match[1])
      .split(',')
      .map((selector) => selector.trim())
      .filter(Boolean)
      .forEach((selector) => rules.set(selector, declarations));
  }

  return rules;
}

function selectorMatchesRenderedMarkup(document, selector) {
  const applicabilitySelector = selector.split(',')[0].trim();
  try {
    return document.querySelector(applicabilitySelector) !== null;
  } catch (error) {
    throw new Error(
      `Invalid locked mobile typography selector "${applicabilitySelector}": ${error.message}`,
    );
  }
}

function parseRenderedMarkup(html) {
  const markup = html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  return new JSDOM(markup).window.document;
}

function verifyRoleRules(css, lock, sourceLabel, { renderedHtml = null } = {}) {
  const mobileCss = extractMediaQueryBody(css, lock.breakpoint);
  const rules = parseCssRules(mobileCss);
  const renderedDocument = renderedHtml === null || renderedHtml === undefined
    ? null
    : parseRenderedMarkup(renderedHtml);

  lock.roles.forEach((role) => {
    const selector = normalizeSelector(role.selector);
    const applicabilitySelector = selector.split(',')[0].trim();
    const declarations = rules.get(applicabilitySelector);
    if (!declarations) {
      if (renderedDocument && !selectorMatchesRenderedMarkup(renderedDocument, selector)) return;

      throw new Error(
        `${sourceLabel} is missing locked mobile typography selector for ${role.id}: ${role.selector}`,
      );
    }

    Object.entries(role.declarations).forEach(([property, expectedValue]) => {
      const actualValue = declarations[property.toLowerCase()];
      if (!matchesExpectedDeclaration(actualValue, expectedValue)) {
        throw new Error(
          `${sourceLabel} mobile typography drift for ${role.id} ${property}: expected ${formatExpectedValues(expectedValue)}, found "${actualValue || 'missing'}"`,
        );
      }
    });
  });
}

function verifySectionStyleTokens(sectionStyles, lock, sourceLabel) {
  Object.entries(lock.sectionStyleTokens || {}).forEach(([pathExpression, expectedValue]) => {
    const actualValue = pathExpression
      .split('.')
      .reduce((value, key) => value?.[key], sectionStyles);
    const acceptedValues = expectedValues(expectedValue);
    if (!acceptedValues.includes(actualValue)) {
      throw new Error(
        `${sourceLabel} mobile typography token drift for ${pathExpression}: expected ${formatExpectedValues(expectedValue)}, found "${actualValue ?? 'missing'}"`,
      );
    }
  });
}

function verifyBaseRoleRules(renderedHtml, lock, sourceLabel) {
  const document = parseRenderedMarkup(renderedHtml);
  const warnings = [];

  (lock.baseRoles || []).forEach((role) => {
    let elements;
    try {
      elements = [...document.querySelectorAll(role.selector)];
    } catch (error) {
      throw new Error(
        `Invalid locked base typography selector "${role.selector}": ${error.message}`,
      );
    }

    if (elements.length === 0) {
      return;
    }

    elements.forEach((element, index) => {
      const declarations = parseDeclarations(element.getAttribute('style') || '');
      Object.entries(role.declarations).forEach(([property, expectedValue]) => {
        const actualValue = declarations[property.toLowerCase()];
        if (!matchesExpectedDeclaration(actualValue, expectedValue)) {
          const message =
            `${sourceLabel} base typography drift for ${role.id}[${index}] ${property}: expected ${formatExpectedValues(expectedValue)}, found "${actualValue || 'missing'}"`;

          // Base line-height is allowed to vary between renderers and authored
          // email fragments. Mobile CSS roles and base font sizes remain hard
          // failures because those changes can materially alter readability.
          if (property.toLowerCase() === 'line-height') {
            warnings.push(message);
            return;
          }

          throw new Error(message);
        }
      });
    });
  });

  return warnings;
}

export function verifyMobileTypographyLock({
  repoRoot,
  templateName,
  renderedHtml,
  sourcePath,
  outputHtmlPath,
  outputName,
  ignoredAuthoredOverrides = [],
}) {
  const { ledgerPath, entry } = getLatestMobileTypographyLock(repoRoot, templateName);
  if (!entry) return null;

  const layoutPath = path.join(repoRoot, 'templates', templateName, 'layouts', 'main.html');
  const sectionStylesPath = path.join(
    repoRoot,
    'templates',
    templateName,
    'section-styles.json',
  );
  const layout = fs.readFileSync(layoutPath, 'utf8');
  const sectionStyles = JSON.parse(fs.readFileSync(sectionStylesPath, 'utf8'));

  verifyRoleRules(layout, entry, `${templateName} layout`);
  verifySectionStyleTokens(sectionStyles, entry, `${templateName} section-styles.json`);
  const baseTypographyWarnings = verifyBaseRoleRules(
    renderedHtml,
    entry,
    `${outputName} rendered HTML`,
  );
  verifyRoleRules(renderedHtml, entry, `${outputName} rendered HTML`, {
    renderedHtml,
  });

  return {
    schemaVersion: 2,
    status: baseTypographyWarnings.length > 0 ? 'verified-with-warnings' : 'verified',
    template: templateName,
    outputName,
    sourcePath,
    outputHtmlPath,
    verifiedAt: new Date().toISOString(),
    lock: {
      ledgerPath,
      sequence: entry.sequence,
      hash: entry.hash,
      recordedAt: entry.recordedAt,
      reason: entry.reason,
      breakpoint: entry.breakpoint,
    },
    roles: entry.roles.map((role) => ({
      id: role.id,
      selector: role.selector,
      declarations: role.declarations,
    })),
    baseRoles: (entry.baseRoles || []).map((role) => ({
      id: role.id,
      selector: role.selector,
      declarations: role.declarations,
    })),
    warnings: baseTypographyWarnings,
    ignoredAuthoredOverrides,
  };
}
