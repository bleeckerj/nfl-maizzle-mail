// Visit original section and nested ad objects without copying authored content.
// Hydration, styles, image checks, and commerce rendering share these references.
export function getNewsletterSectionEntries(newsletterData) {
  const entries = [];
  if (!Array.isArray(newsletterData?.sections)) return entries;
  newsletterData.sections.forEach((section, sectionIndex) => {
    const path = `sections[${sectionIndex}]`;
    entries.push({ section, sectionIndex, path });
    const visitBodyAds = (blocks, bodyPath) => {
      if (!Array.isArray(blocks)) return;
      blocks.forEach((block, blockIndex) => {
        if (block?.type === 'ad-block') {
          entries.push({ section: block, sectionIndex, path: `${bodyPath}[${blockIndex}]` });
        }
      });
    };
    if (section?.type === 'intro_statement') visitBodyAds(section.body_blocks, `${path}.body_blocks`);
    if (section?.type === 'section_article_group' && Array.isArray(section.articles)) {
      section.articles.forEach((article, articleIndex) => {
        visitBodyAds(article?.body_blocks, `${path}.articles[${articleIndex}].body_blocks`);
      });
    }
  });
  return entries;
}
