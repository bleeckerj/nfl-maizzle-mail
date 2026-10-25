/** Check background safety, image proportions, and the readable text backing.
 * The helper consumes image metadata only and performs no network or file writes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareSpeculativeJobBackground } from '../../lib/newsletter-core/speculative-job-background.mjs';

test('texture keeps its proportions and supplies a light text backing', () => {
  const item = { backgroundImage: { src:'https://images.example.com/texture.jpg', width:880, height:882 } };
  prepareSpeculativeJobBackground(item);
  assert.match(item.speculativeJobBackgroundStyleInline, /height:640px/);
  assert.match(item.speculativeJobBackgroundStyleInline, /background-size:100% auto/);
  assert.match(item.speculativeJobBackgroundStyleInline, /background-repeat:repeat-y/);
  assert.match(item.speculativeJobBackgroundTextStyleInline, /rgba\(255,255,255,0.72\)/);
});

test('backgrounds reject executable URLs and unusable dimensions', () => {
  assert.throws(() => prepareSpeculativeJobBackground({backgroundImage:{src:'javascript:alert(1)',width:880,height:882}}), /HTTP/);
  assert.throws(() => prepareSpeculativeJobBackground({backgroundImage:{src:'https://images.example.com/texture.jpg',width:0,height:882}}), /positive/);
  const item = {backgroundImage:{src:"https://images.example.com/it's-blue.jpg",width:880,height:882}};
  prepareSpeculativeJobBackground(item);
  assert.match(item.speculativeJobBackgroundStyleInline, /it%27s-blue/);
});
