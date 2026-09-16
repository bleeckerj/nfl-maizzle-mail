import { renderCommerceBand } from 'nfl-native-lockups/commerce-band';

/** Expand internal panel placeholders after component locals have been decoded.
 * Input is rendered template HTML and hydrated newsletter data. Output retains
 * live table markup for Maizzle to inline and verify, with no network or writes.
 */
export function renderCommerceBands(html, newsletterData) {
  const commerceById = new Map();
  for (const section of newsletterData?.sections ?? []) {
    if (section.type !== 'ad-block') continue;
    for (const item of section.items ?? []) {
      if (item.commerce) commerceById.set(item.adId, item.commerce);
    }
  }
  return html.replace(/<div\b[^>]*data-commerce-band-id="([^"]+)"[^>]*>\s*<\/div>/g, (_, id) => {
    const commerce = commerceById.get(id);
    if (!commerce) throw new Error(`Commerce panel has no hydrated inventory data: ${id}`);
    return renderCommerceBand(commerce);
  });
}
