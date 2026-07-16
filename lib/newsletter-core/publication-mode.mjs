export const PUBLICATION_MODES = Object.freeze({
  PUBLIC_ISSUE: 'public-issue',
  CAMPAIGN: 'campaign',
});

export function resolvePublicationMode(newsletterData, explicitMode) {
  if (explicitMode && newsletterData?.publicationMode && explicitMode !== newsletterData.publicationMode) {
    throw new Error(
      `publicationMode mismatch: source declares "${newsletterData.publicationMode}" but build requested "${explicitMode}".`,
    );
  }
  const candidate = explicitMode || newsletterData?.publicationMode || PUBLICATION_MODES.PUBLIC_ISSUE;
  if (!Object.values(PUBLICATION_MODES).includes(candidate)) {
    throw new Error(
      `Unsupported publicationMode "${candidate}". Expected "public-issue" or "campaign".`,
    );
  }
  return candidate;
}
