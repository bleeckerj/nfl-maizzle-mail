// Visit real section objects without flattening an authored intro or copying its ads.
// Hydration, styles, image checks, and commerce rendering share these references.
export function getNewsletterSectionEntries(newsletterData) {
  const entries = [];
  if (!Array.isArray(newsletterData?.sections)) return entries;
  newsletterData.sections.forEach((section, sectionIndex) => {
    const path = `sections[${sectionIndex}]`;
    entries.push({ section, sectionIndex, path });
    if (section?.type !== 'intro_statement' || !Array.isArray(section.body_blocks)) return;
    section.body_blocks.forEach((block, blockIndex) => {
      if (block?.type === 'ad-block') {
        entries.push({ section: block, sectionIndex, path: `${path}.body_blocks[${blockIndex}]` });
      }
    });
  });
  return entries;
}
