const UNSAFE_CSS_VALUE = /[;{}<>]/;
const LINEAR_GRADIENT = /^linear-gradient\([^;{}<>]+\)$/i;
const DEFAULT_CONTENT_PADDING = '0 20px';

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

/**
 * Turns an authored CSS padding shorthand into horizontal declarations for
 * text-bearing cells. The parent table retains the background so the colored
 * surface remains full width.
 */
export function resolveSectionContentPadding(containerStyles = {}) {
  const contentPadding = normalizeCssValue(containerStyles.contentPadding) || DEFAULT_CONTENT_PADDING;
  const values = contentPadding.split(/\s+/);

  if (values.length > 4) {
    return {
      contentPadding: DEFAULT_CONTENT_PADDING,
      inlineStyle: 'padding-left:20px;padding-right:20px;',
    };
  }

  const [top, right = top, bottom = top, left = right] = values;
  return {
    contentPadding,
    inlineStyle: `padding-left:${left};padding-right:${right};`,
  };
}
