import { JSDOM } from 'jsdom';

// Job references are valid authoring inputs. Rendering and delivery require populated
// titles and destinations; these checks also protect callers that skip hydration.
const isMissing = (value) => typeof value !== 'string' || !value.trim() || /^(undefined|null)$/i.test(value.trim());
export function speculativeJobHref(item) {
  return typeof item?.link === 'string' ? item.link : item?.link?.href || item?.link?.url || '';
}
export function isSpeculativeJobPrepared(item) {
  return !isMissing(item?.headline) && /^(https?:\/\/|\/(?!\/))/.test(speculativeJobHref(item));
}
export function assertSpeculativeJobsPrepared(newsletterData) {
  for (const [sectionIndex, section] of (newsletterData?.sections || []).entries()) {
    if (section?.type !== 'speculative-job') continue;
    if (!Array.isArray(section.items) || !section.items.length) {
      throw new Error(`speculative-job sections[${sectionIndex}] requires at least one resolved job.`);
    }
    section.items.forEach((item, itemIndex) => {
      if (!isSpeculativeJobPrepared(item)) {
        throw new Error(`Unresolved speculative-job ${item?.jobRef || '(missing jobRef)'} at sections[${sectionIndex}].items[${itemIndex}]: headline and destination are required before rendering. Use the canonical newsletter build or asynchronous source loader to resolve jobRef.`);
      }
    });
  }
}

const text = (value) => JSDOM.fragment(String(value)).textContent.replace(/\s+/g, ' ').trim();

// Inspect the finished HTML independently of source validation. expectedNewsletter
// adds title, URL, and count parity checks; senders can reject broken HTML alone.
export function assertRenderedSpeculativeJobs(html, expectedNewsletter) {
  if (!expectedNewsletter?.sections?.some((section) => section?.type === 'speculative-job')
      && !/data-section=["']speculative-job["']/.test(html)) return;
  const dom = new JSDOM(html);
  try {
    const sections = [...dom.window.document.querySelectorAll('[data-section="speculative-job"]')];
    const expected = expectedNewsletter?.sections?.filter((section) => section?.type === 'speculative-job');
    if (expected && sections.length !== expected.length) {
      throw new Error('Rendered speculative-job section count does not match the newsletter.');
    }
    sections.forEach((section, index) => {
      const headings = [...section.querySelectorAll('h3')];
      const items = expected?.[index]?.items;
      if (!headings.length || (items && headings.length !== items.length)) {
        throw new Error('Rendered speculative-job card count does not match the newsletter.');
      }
      headings.forEach((heading, itemIndex) => {
        const title = heading.textContent.replace(/\s+/g, ' ').trim();
        const href = heading.closest('a')?.getAttribute('href') || '';
        if (isMissing(title) || !/^(https?:\/\/|\/(?!\/))/.test(href)) {
          throw new Error('Rendered speculative-job has an empty or undefined title or destination; output and test delivery are blocked.');
        }
        if (items && (title !== text(items[itemIndex].headline) || href !== speculativeJobHref(items[itemIndex]))) {
          throw new Error(`Rendered speculative-job differs from its resolved title or destination: ${items[itemIndex].jobRef}`);
        }
      });
      for (const anchor of section.querySelectorAll('a')) {
        if (!/^(https?:\/\/|\/(?!\/))/.test(anchor.getAttribute('href') || '')) {
          throw new Error('Rendered speculative-job has an invalid link; output and test delivery are blocked.');
        }
      }
    });
  } finally {
    dom.window.close();
  }
}
