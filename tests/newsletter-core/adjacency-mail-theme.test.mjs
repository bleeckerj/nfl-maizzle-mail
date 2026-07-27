import test from 'node:test';
import assert from 'node:assert/strict';

import {
  adjacencyMailThemeTokens,
  buildAdjacencyMailSectionStyleOverrides,
} from '../../lib/adjacency-mail/adjacency-mail-theme-tokens.mjs';
import {
  adjacencyJobsMailThemeTokens,
  buildAdjacencyJobsMailSectionStyleOverrides,
  resolveAdjacencyJobsMailVariantTokens,
} from '../../lib/adjacency-mail/adjacency-jobs-mail-theme-tokens.mjs';

test('adjacency mail section overrides derive from the canonical mail theme tokens', () => {
  const overrides = buildAdjacencyMailSectionStyleOverrides();

  assert.equal(
    overrides['ad-block'].headingStyles.fontFamily,
    adjacencyMailThemeTokens.ad.title.fontFamily,
  );
  assert.equal(
    overrides['ad-block'].contentStyles.fontFamily,
    adjacencyMailThemeTokens.ad.copy.fontFamily,
  );
  assert.equal(
    overrides['ad-block'].linkStyles.fontSize,
    overrides['ad-block'].labelStyles.fontSize,
  );
  assert.equal(
    overrides['ad-block'].linkStyles.lineHeight,
    overrides['ad-block'].labelStyles.lineHeight,
  );
  assert.equal(
    overrides['ad-block'].linkStyles.letterSpacing,
    overrides['ad-block'].labelStyles.letterSpacing,
  );
  assert.equal(
    overrides['adjacency-feature'].headingStyles.fontFamily,
    adjacencyMailThemeTokens.featureSection.title.fontFamily,
  );
  assert.equal(
    overrides['adjacency-feature'].contentStyles.fontFamily,
    adjacencyMailThemeTokens.featureSection.body.fontFamily,
  );
  assert.equal(
    overrides['adjacency-feature'].containerStyles.bodyPadding,
    adjacencyMailThemeTokens.featureSection.container.bodyPadding,
  );
  assert.equal(
    overrides['ad-block'].containerStyles.copyPadding,
    adjacencyMailThemeTokens.ad.sectionContainer.copyPadding,
  );
});

test('adjacency jobs mail section overrides derive from the canonical jobs mail theme tokens', () => {
  const overrides = buildAdjacencyJobsMailSectionStyleOverrides();
  const defaultVariant = resolveAdjacencyJobsMailVariantTokens(adjacencyJobsMailThemeTokens.defaultVariant);

  assert.equal(
    overrides['adjacency-job-posting'].headingStyles.fontFamily,
    defaultVariant.title.fontFamily,
  );
  assert.equal(
    overrides['adjacency-job-posting'].contentStyles.fontFamily,
    defaultVariant.prose.paragraph.fontFamily,
  );
});
