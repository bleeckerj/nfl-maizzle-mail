const hasOwn = (value, property) =>
  Object.prototype.hasOwnProperty.call(value, property);

export const DENSE_DISCOVERY_LOCKED_INTRO_TYPOGRAPHY_PROPERTIES = Object.freeze([
  'fontSize',
  'lineHeight',
]);

export function resolveIntroContentStyles({
  baseStyles = {},
  incomingStyles = {},
  lockedProperties = [],
  sourcePath = 'intro.contentStyles',
}) {
  const styles = { ...baseStyles, ...incomingStyles };
  const ignoredAuthoredOverrides = [];

  lockedProperties.forEach((property) => {
    if (!hasOwn(baseStyles, property)) {
      throw new Error(
        `Cannot lock ${sourcePath}.${property}: the canonical base style is missing`,
      );
    }

    if (hasOwn(incomingStyles, property)) {
      ignoredAuthoredOverrides.push({
        path: `${sourcePath}.${property}`,
        authoredValue: incomingStyles[property],
        resolvedValue: baseStyles[property],
      });
    }

    styles[property] = baseStyles[property];
  });

  return {
    styles,
    ignoredAuthoredOverrides,
  };
}
