import {
  inlineStylesToString,
  resolveAdjacencyJobsMailVariantTokens,
  styleAdjacencyJobsMailInlineHtml,
  styleAdjacencyJobsMailHtmlFragment,
} from '../adjacency-mail/adjacency-jobs-mail-theme-tokens.mjs';

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function prepareAdjacencyJobPostingSection(section) {
  if (!section || section.type !== 'adjacency-job-posting') {
    return section;
  }

  const tokens = resolveAdjacencyJobsMailVariantTokens(section.brandVariant);
  const styledSection = structuredClone(section);

  styledSection.brandVariant = section.brandVariant || 'adjacency-jobs-default';
  styledSection.jobPresentation = {
    metaPresentation: tokens.layout?.metaPresentation || 'chips',
  };
  styledSection.jobStyles = {
    shell: inlineStylesToString({
      background: tokens.shell.backgroundColor,
      border: `${tokens.shell.borderWidth} ${tokens.shell.borderStyle} ${tokens.shell.borderColor}`,
      borderRadius: tokens.shell.borderRadius,
      overflow: 'hidden',
    }),
    header: inlineStylesToString({
      background: tokens.header.backgroundColor,
      padding: '0',
    }),
    headerInner: inlineStylesToString(tokens.headerInner),
    companyRow: inlineStylesToString(tokens.companyRow),
    companyIcon: inlineStylesToString(tokens.companyIcon),
    company: inlineStylesToString(tokens.company),
    companyTagline: inlineStylesToString(tokens.companyTagline),
    title: inlineStylesToString(tokens.title),
    metaRow: inlineStylesToString(tokens.metaRow),
    metaChip: inlineStylesToString(tokens.metaChip),
    ctaPrimary: inlineStylesToString(tokens.ctaPrimary, true),
    ctaSecondary: inlineStylesToString(tokens.ctaSecondary, true),
    tag: inlineStylesToString(tokens.tag),
    contentSection: inlineStylesToString(tokens.contentSection),
    sectionHeading: inlineStylesToString(tokens.sectionHeading),
    divider: inlineStylesToString(tokens.divider),
    list: inlineStylesToString(tokens.list),
    listItem: inlineStylesToString(tokens.listItem),
    compensationBox: inlineStylesToString(tokens.compensationBox),
    footerNotesBox: inlineStylesToString(tokens.footerNotesBox),
    footerCtaBox: inlineStylesToString(tokens.footerNotesBox),
    sourceLink: inlineStylesToString(tokens.sourceLink, true),
  };

  styledSection.summaryHtml = styleAdjacencyJobsMailHtmlFragment(section.summaryHtml, tokens.prose);
  styledSection.descriptionHtml = styleAdjacencyJobsMailHtmlFragment(section.descriptionHtml, tokens.prose);
  styledSection.payRangeHtml = styleAdjacencyJobsMailHtmlFragment(section.payRangeHtml, tokens.prose);
  styledSection.bodyHtml = styleAdjacencyJobsMailHtmlFragment(section.bodyHtml, tokens.prose);
  styledSection.footerNotesHtml = normalizeArray(section.footerNotesHtml).map((note) =>
    styleAdjacencyJobsMailHtmlFragment(note, tokens.prose),
  );
  if (section.footerCta?.textHtml) {
    styledSection.footerCta = {
      ...section.footerCta,
      textHtml: styleAdjacencyJobsMailHtmlFragment(section.footerCta.textHtml, tokens.prose),
    };
  }
  styledSection.lists = normalizeArray(section.lists).map((list) => ({
    ...list,
    itemsHtml: normalizeArray(list.itemsHtml || list.items).map((item) =>
      styleAdjacencyJobsMailInlineHtml(String(item), tokens.prose),
    ),
  }));

  return styledSection;
}
