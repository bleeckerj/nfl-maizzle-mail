export const isRecruitingEmailTemplate = name => ['adjacency-recruiting', 'gdm-special-projects'].includes(name);

/** Prepare sharing without exposing recipient-specific email links. */
export function prepareAdjacencyRecruiting(newsletterData) {
  if (!isRecruitingEmailTemplate(newsletterData?.template) || !newsletterData.share?.enabled) return;
  const link = newsletterData.job?.link;
  const href = typeof link === 'string' ? link : link?.href;
  if (!href) throw new Error('Recruiting email sharing requires a public job link.');
  const encode = value => encodeURIComponent(value).replace(/[!'()*]/g, character =>
    '%' + character.codePointAt(0).toString(16).toUpperCase());
  const share = newsletterData.share;
  share.emailHref = 'mailto:?subject=' + encode(share.subject)
    + '&body=' + encode(share.message + '\n\n' + href);
}
