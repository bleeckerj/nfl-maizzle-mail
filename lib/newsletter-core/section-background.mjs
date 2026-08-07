const UNSAFE_CSS_VALUE = /[;{}<>]/;
const LINEAR_GRADIENT = /^linear-gradient\([^;{}<>]+\)$/i;

function normalizeCssValue(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || UNSAFE_CSS_VALUE.test(normalized)) return null;
  return normalized;
}

/**
 * Produces email-safe background declarations for an existing section element.
 * A solid color always precedes a gradient, preserving a visible fallback in
 * clients that do not render CSS gradients.
 */
export function resolveSectionBackgroundStyle(containerStyles = {}) {
  const backgroundColor = normalizeCssValue(containerStyles.backgroundColor);
  const authoredGradient = normalizeCssValue(containerStyles.backgroundGradient);
  const backgroundGradient = authoredGradient && LINEAR_GRADIENT.test(authoredGradient)
    ? authoredGradient
    : null;

  const declarations = [];
  if (backgroundColor) declarations.push(`background-color:${backgroundColor}`);
  if (backgroundGradient) declarations.push(`background-image:${backgroundGradient}`);

  return {
    backgroundColor,
    backgroundGradient,
    inlineStyle: declarations.length ? `${declarations.join(';')};` : '',
  };
}
