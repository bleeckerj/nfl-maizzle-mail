// Resolve a registry palette and optional Markdown color overrides for rendering.
// Return fresh objects so template colors and generated link CSS use the same values
// without modifying the registry or the authored source data.
export function resolveNewsletterTheme(palette, overrides = {}) {
  if (!palette) return undefined;
  const authoredColors = overrides && typeof overrides === 'object' && !Array.isArray(overrides)
    ? Object.fromEntries(Object.entries(overrides).filter(([, value]) => typeof value === 'string' && value.trim()))
    : {};
  const { linkAccent = palette.linkAccent, ...sectionColors } = authoredColors;
  const colors = { ...palette.colors, ...sectionColors };
  return {
    theme: { ...palette, colors, linkAccent },
    themeColors: { ...colors, linkAccent },
  };
}
