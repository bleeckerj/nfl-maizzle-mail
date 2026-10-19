// Render both templates with the same account list to check extraction and
// Daily Headlines compatibility without calling external services.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { render as renderEmail } from '@maizzle/framework';
import { JSDOM } from 'jsdom';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { normalizeNewsletterLinkTracking, enrichHtmlWithLinkTrackingMetadata } from '../../lib/newsletter-core/link-tracking-metadata.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const platforms = {
  github: [['https://github.com/bleeckerj', 'Personal GitHub'], ['https://github.com/nearfuturelaboratory', 'Near Future Laboratory GitHub']],
  applepodcasts: [['https://podcasts.apple.com/us/podcast/near-future-laboratory-podcast/id1546452193', 'Near Future Laboratory on Apple Podcasts']],
  spotify: [['https://open.spotify.com/show/1vHzwGE5J19LvXSo8M93MM', 'Near Future Laboratory on Spotify']],
  instagram: [['https://instagram.com/darthjulian', 'Personal Instagram'], ['https://instagram.com/nearfuturelaboratory', 'Company Instagram']],
  linkedin: [['https://linkedin.com/in/julianbleecker', 'Personal LinkedIn'], ['https://www.linkedin.com/company/near-future-laboratory/', 'Near Future Laboratory LinkedIn']],
  youtube: [['https://youtube.com/@nearfuturelaboratory', 'YouTube Channel']],
  discord: [['https://patreon.com/nearfuturelaboratory', 'Join Patreon to join the Discord Community']],
  patreon: [['https://patreon.com/nearfuturelaboratory', 'Support me on Patreon']],
  substack: [['https://newsletter.substack.com', 'Newsletter on Substack']],
};

function accounts() {
  return Object.fromEntries(Object.entries(platforms).map(([platform, entries]) => [platform, entries.map(([href, title]) => ({
    url: { href, label: `footer | ${title}`, category: ['patreon', 'discord'].includes(platform) ? 'community' : 'social' }, title,
  }))]));
}

async function render(template, socialLinks, footerSection = {}) {
  const newsletter = {
    template, title: 'Footer check', darkModePolicy: { flatten: true },
    footer: { footerCta: { enabled: false }, ...(socialLinks === undefined ? {} : { socialLinks }) },
    sections: template === 'dense-discovery' ? [] : [{
      type: 'email_footer', address: 'Near Future Laboratory. Venice Beach, CA.',
      unsubscribe_label: 'Unsubscribe', unsubscribe_href: '[unsubscribe]',
      social_links: [{ href: 'https://example.org/profile', label: 'Legacy profile' }],
      ...footerSection,
    }],
  };
    const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
    addFormats(ajv);
    const validate = ajv.compile(JSON.parse(readFileSync(path.join(root, 'templates', template, 'newsletter.schema.json'))));
    assert.equal(validate(newsletter), true, JSON.stringify(validate.errors));
    // Discord and Patreon deliberately share a destination and tracking intent.
    if (socialLinks?.discord && socialLinks?.patreon) newsletter.footer.socialLinks.patreon[0].url.label = newsletter.footer.socialLinks.discord[0].url.label;
    const tracking = normalizeNewsletterLinkTracking(newsletter);
    const rendered = await renderEmail(readFileSync(path.join(root, 'templates', template, 'newsletter.html'), 'utf8'), {
      useFileConfig: false,
      tailwind: { compiled: '' },
      maizzle: { inlineCSS: false, locals: newsletter },
    });
    const html = enrichHtmlWithLinkTrackingMetadata(rendered.html, tracking.manifest, tracking.records);
    return { html, document: new JSDOM(html).window.document, tracking };
}

for (const template of ['dense-discovery', 'near-future-lab-daily-headlines']) {
  test(`${template} renders the shared 12-icon footer with accessible tracked links`, async () => {
    const { document, html } = await render(template, accounts());
    const strip = document.querySelector('.footer-social-links');
    assert.ok(strip);
    const icons = [...strip.querySelectorAll('a')];
    const expected = Object.values(platforms).flat();
    assert.equal(icons.length, 12);
    icons.forEach((anchor, index) => {
      const [href, title] = expected[index];
      assert.equal(anchor.getAttribute('href'), href);
      assert.equal(anchor.title, title);
      assert.ok(anchor.dataset.linkLabel);
      assert.ok(anchor.dataset.linkCategory);
      const image = anchor.querySelector('img');
      assert.equal(new URL(image.src).hostname, 'img.icons8.com');
      assert.equal(image.alt, title);
      assert.equal(image.width, 24);
      assert.equal(image.height, 24);
      assert.ok(image.classList.contains('dm-footer-artwork'));
    });
    assert.equal(document.querySelectorAll('a[href="https://icons8.com"]').length, 1);
    assert.match(html, /\.footer-social-links td\s*\{[^}]*display:\s*inline-block\s*!important/);
    assert.match(html, /\.dm-bg \.dm-footer-artwork\s*\{[^}]*filter:\s*brightness\(0\) invert\(1\)/);
    if (template === 'near-future-lab-daily-headlines') {
      assert.equal(document.querySelector('a[href="https://example.org/profile"]'), null);
      assert.ok(html.indexOf('class="footer-social-links"') < html.indexOf('Near Future Laboratory. Venice Beach, CA.'));
      assert.ok(document.querySelector('a[href="[unsubscribe]"]'));
    }
  });
}

test('Daily Headlines keeps text links when icons are omitted or all account lists are empty', async () => {
  for (const socialLinks of [undefined, {}, { github: [] }]) {
    const { document } = await render('near-future-lab-daily-headlines', socialLinks);
    assert.equal(document.querySelector('.footer-social-links'), null);
    assert.equal(document.querySelector('a[href="https://example.org/profile"]').textContent, 'Legacy profile');
    assert.equal(document.querySelector('a[href="https://icons8.com"]'), null);
  }
});

test('Daily Headlines retains legacy raw footer HTML when shared icons are added', async () => {
  for (const socialLinks of [undefined, accounts()]) {
    const { document } = await render('near-future-lab-daily-headlines', socialLinks, {
      address: undefined, social_links: undefined, unsubscribe_label: undefined, unsubscribe_href: undefined,
      footer_html: '<tr><td><p>Legacy legal copy.</p><a href="[unsubscribe]">Legacy unsubscribe</a></td></tr>',
    });
    assert.match(document.querySelector('.mob-footer').textContent, /Legacy legal copy/);
    assert.equal(document.querySelector('a[href="[unsubscribe]"]').textContent, 'Legacy unsubscribe');
    assert.equal(document.querySelectorAll('.footer-social-links img').length, socialLinks ? 12 : 0);
  }
});
