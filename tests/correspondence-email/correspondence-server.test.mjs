import test from 'node:test';
import assert from 'node:assert/strict';

import { createCorrespondenceServer } from '../../scripts/correspondence-server.mjs';

test('correspondence render server requires its bearer token', async () => {
  const server = createCorrespondenceServer({ token: 'test-token' });
  await listen(server);
  try {
    const response = await fetch(baseUrl(server) + '/render/correspondence', {
      method: 'POST',
      body: JSON.stringify({ subject: 'Test' }),
    });
    assert.equal(response.status, 401);
  } finally {
    server.close();
  }
});

test('correspondence render server returns standard correspondence html and text', async () => {
  const server = createCorrespondenceServer({ token: 'test-token' });
  await listen(server);
  try {
    const response = await fetch(baseUrl(server) + '/render/correspondence', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: 'standard-correspondence',
        subject: 'Office Hours share confirmation',
        preheader: 'Your Office Hours share is confirmed.',
        bodyMarkdown: 'Hello Ada,\\n\\nYour topic is **Synthetic gardens <script>alert(1)</script>**.',
        signature: { name: 'Julian', lines: ['[Near Future Laboratory](https://nearfuturelaboratory.com)'] },
        footerNote: 'Reply directly to this email.',
      }),
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.subject, 'Office Hours share confirmation');
    assert.match(payload.htmlBody, /Synthetic gardens/);
    assert.match(payload.textBody, /Synthetic gardens/);
    assert.doesNotMatch(payload.htmlBody, /<script>/i);
    assert.doesNotMatch(payload.htmlBody, /unsubscribe/i);
    assert.doesNotMatch(payload.htmlBody, /tracking/i);
  } finally {
    server.close();
  }
});

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
}

function baseUrl(server) {
  const address = server.address();
  return 'http://127.0.0.1:' + address.port;
}
