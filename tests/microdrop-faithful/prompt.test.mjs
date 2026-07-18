import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMicrodropAssemblyPrompt,
  MICRODROP_ASSEMBLY_PROMPT_VERSION,
} from '../../scripts/microdrop-email-assembly/prompt.mjs';

test('faithful prompt is generic and contains Tensor-specific assembly guidance', () => {
  const prompt = buildMicrodropAssemblyPrompt({
    sourcePacket: {
      renderer: { id: 'tensor-dosimeter' },
      assemblyGuidance: [],
    },
    templatePacket: { name: 'microdrop-faithful' },
  });
  assert.equal(MICRODROP_ASSEMBLY_PROMPT_VERSION, 'microdrop-faithful-v2');
  assert.match(prompt.user, /exactly four ordered images/);
  assert.match(prompt.user, /816 gNIT/);
  assert.match(prompt.user, /self-aware explanatory representations/);
  assert.match(prompt.user, /Exclude editorialNote/);
  assert.doesNotMatch(prompt.user, /apple-inframaximal-v1/);
});
