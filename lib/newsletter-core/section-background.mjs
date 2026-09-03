const UNSAFE_CSS_VALUE = /[;{}<>]/;
const DEFAULT_CONTENT_PADDING = '0 20px';

function normalizeCssValue(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || UNSAFE_CSS_VALUE.test(normalized)) return null;
  return normalized;
}

function isSafeGradient(value) {
  if (!/^(?:linear|radial)-gradient\(/i.test(value)) return false;

  const layers = [];
  let layerStart = 0;
  let depth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '(') depth += 1;
    if (character === ')') {
      depth -= 1;
      if (depth < 0) return false;
    }
    if (character === ',' && depth === 0) {
      layers.push(value.slice(layerStart, index).trim());
      layerStart = index + 1;
    }
  }

  if (depth !== 0) return false;
  layers.push(value.slice(layerStart).trim());

  return layers.every((layer) => /^(?:linear|radial)-gradient\([^;{}<>]+\)$/i.test(layer));
}

/**
 * Produces email-safe background declarations for an existing section element.
 * A solid color precedes an explicit gradient when one is supplied. Legacy
 * sources may put a gradient directly in backgroundColor; that value is emitted
 * as background-image so it remains valid CSS in this renderer.
 */
export function resolveSectionBackgroundStyle(containerStyles = {}) {
  const authoredBackgroundColor = normalizeCssValue(containerStyles.backgroundColor);
  const backgroundColor = authoredBackgroundColor && !isSafeGradient(authoredBackgroundColor)
    ? authoredBackgroundColor
    : null;
  const authoredGradient = normalizeCssValue(containerStyles.backgroundGradient);
  const backgroundGradient = authoredGradient && isSafeGradient(authoredGradient)
    ? authoredGradient
    : authoredBackgroundColor && isSafeGradient(authoredBackgroundColor)
      ? authoredBackgroundColor
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
