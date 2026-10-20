import { readFileSync } from 'node:fs';
import { render } from '@maizzle/framework';

// Render a component with Maizzle's real nested-component pipeline. Callers
// supply resolved locals, replacing only the entry component's props script.
export async function renderNewsletterComponent(file, locals) {
  const template = readFileSync(file, 'utf8').replace(/<script props>[\s\S]*?<\/script>/, '');
  const { html } = await render(`<table role="presentation"><tbody>${template}</tbody></table>`, {
    maizzle: { locals, applyTransformers: false },
    tailwind: { compiled: '' },
  });
  return html;
}
