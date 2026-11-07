/** Check background safety, image proportions, and unobscured text placement.
 * The helper consumes image metadata only and performs no network or file writes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareSpeculativeJobBackground } from '../../lib/newsletter-core/speculative-job-background.mjs';

test('texture covers the full card with text directly over the image', () => {
  const item = { backgroundImage: { src:'https://images.example.com/texture.jpg', width:880, height:882 } };
  prepareSpeculativeJobBackground(item);
  assert.match(item.speculativeJobBackgroundStyleInline, /height:640px/);
  assert.match(item.speculativeJobBackgroundStyleInline, /background-size:cover;/);
  assert.match(item.speculativeJobBackgroundStyleInline, /background-position:center top;/);
  assert.match(item.speculativeJobBackgroundStyleInline, /background-repeat:no-repeat/);
  assert.equal(item.speculativeJobBackgroundTextStyleInline, 'padding:16px;');
});

test('landscape dimensions and explicit repetition are visible in generated styles and diagnostics', () => {
  for (const repeat of ['no-repeat', 'repeat', 'repeat-x', 'repeat-y']) {
    const item = { jobRef:'muse/example', backgroundImage: { src:'https://images.example.com/ocean.png', width:1094, height:656, repeat } };
    const diagnostic = prepareSpeculativeJobBackground(item);
    assert.match(item.speculativeJobBackgroundStyleInline, /height:383px/);
    assert.match(item.speculativeJobBackgroundStyleInline, /background-size:cover;/);
    assert.ok(item.speculativeJobBackgroundStyleInline.includes(`background-repeat:${repeat};`));
    assert.ok(diagnostic.includes(`repeat=${repeat}`));
    assert.ok(diagnostic.includes('original=1094x656'));
    assert.ok(diagnostic.includes('size=cover'));
  }
  assert.throws(() => prepareSpeculativeJobBackground({ backgroundImage: { src:'https://images.example.com/ocean.png', width:1094, height:656, repeat:'repeat; color:red' } }), /repeat must be/);
});

test('backgrounds reject executable URLs and unusable dimensions', () => {
  assert.throws(() => prepareSpeculativeJobBackground({backgroundImage:{src:'javascript:alert(1)',width:880,height:882}}), /HTTP/);
  assert.throws(() => prepareSpeculativeJobBackground({backgroundImage:{src:'https://images.example.com/texture.jpg',width:0,height:882}}), /positive/);
  const item = {backgroundImage:{src:"https://images.example.com/it's-blue.jpg",width:880,height:882}};
  prepareSpeculativeJobBackground(item);
  assert.match(item.speculativeJobBackgroundStyleInline, /it%27s-blue/);
});
