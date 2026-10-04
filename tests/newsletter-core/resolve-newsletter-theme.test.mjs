// Verify authored email colors override palette defaults without changing either input.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveNewsletterTheme } from '../../lib/newsletter-core/resolve-newsletter-theme.mjs';

const registry = JSON.parse(readFileSync(new URL('../../data/color-themes.json', import.meta.url), 'utf8'));

test('authored link and section colors override current in both rendering objects', () => {
  const palette = structuredClone(registry.themes.current);
  const original = structuredClone(palette);
  const overrides = { header: '#ffffff', introAside: '#ffffff', linkAccent: '#0a0a0a' };
  const result = resolveNewsletterTheme(palette, overrides);
  assert.equal(result.themeColors.linkAccent, '#0a0a0a');
  assert.equal(result.theme.linkAccent, '#0a0a0a');
  assert.equal(result.theme.colors.introAside, '#ffffff');
  assert.equal(result.themeColors.introAside, '#ffffff');
  assert.equal(result.themeColors.dispatch, palette.colors.dispatch);
  assert.deepEqual(palette, original);
  assert.deepEqual(overrides, { header: '#ffffff', introAside: '#ffffff', linkAccent: '#0a0a0a' });
});

test('omitted overrides preserve the registry palette', () => {
  const result = resolveNewsletterTheme(registry.themes.current);
  assert.equal(result.theme.linkAccent, '#EE3BBB');
  assert.deepEqual(result.theme.colors, registry.themes.current.colors);
});

test('invalid legacy override values cannot remove palette defaults', () => {
  assert.equal(resolveNewsletterTheme(registry.themes.current, { linkAccent: null, header: '' }).theme.linkAccent, '#EE3BBB');
  assert.equal(resolveNewsletterTheme(undefined), undefined);
});
