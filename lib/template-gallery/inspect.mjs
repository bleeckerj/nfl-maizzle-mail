import { JSDOM } from 'jsdom';

export function inspectPreview(html) {
  const document = new JSDOM(html).window.document;
  for (const element of document.querySelectorAll('style, script, head')) element.remove();
  const text = document.body?.textContent?.trim() || '';
  const warnings = [];
  if (/\bundefined\b/.test(text)) warnings.push('Rendered sample contains an undefined value; its template or sample needs refinement.');
  if (!text && !document.querySelector('img')) warnings.push('Rendered sample has no visible text or images.');
  if (['extends', 'component', 'each', 'block'].some(tag => document.getElementsByTagName(tag).length)) {
    warnings.push('Rendered sample still contains uncompiled template elements.');
  }
  return warnings;
}
