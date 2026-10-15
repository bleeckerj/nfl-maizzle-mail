// Resolve the authored card-footer name after schema validation. Downstream
// exporters keep one footerCopy value; the source object is cloned by preparation.
// Presence controls precedence so an empty or null footer can hide older copy.
export function normalizeSocialCardFooter(socialCard) {
  if (!socialCard || typeof socialCard !== 'object' || Array.isArray(socialCard)) return;
  if (Object.hasOwn(socialCard, 'footer')) {
    socialCard.footerCopy = socialCard.footer;
    delete socialCard.footer;
  }
}
