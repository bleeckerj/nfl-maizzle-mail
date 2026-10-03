/**
 * Prepare render-only CTA values without changing authored controls. Used by
 * each CTA component, including direct template renders. Pixel
 * lengths accept numbers and numeric strings with an optional px suffix.
 */
function inlineCtaPresentation(section, template) {
  const brain = template === 'brain-dead-template';
  const mono = brain ? 'Courier New, Courier, monospace' : template === 'dense-discovery' ? 'Share Tech Mono, Courier New, Courier, monospace' : 'monospace';
  const pixels = (value, fallback) => {
    const candidate = value ?? fallback;
    if (!/^(?:\d+(?:\.\d+)?|\.\d+)(?:px)?$/.test(String(candidate))) throw new Error(`Invalid pixel length: ${JSON.stringify(value)}; expected a nonnegative number or px value.`);
    return `${parseFloat(candidate)}px`;
  };
  const statement = (section.statement || '').replace(/\r\n?/g, '\n').trim();
  const hasBlockHtml = /<\/?(?:p|div|table|ul|ol|li|blockquote|h[1-6]|section|article)\b/i.test(statement);
  return {
    spaceTop: pixels(section.space_top, brain ? 18 : 28),
    spaceBottom: pixels(section.space_bottom, brain ? 18 : 28),
    borderWidth: pixels(section.border_width, brain ? 2 : 1),
    borderRadius: pixels(section.border_radius, 0),
    buttonBorderWidth: pixels(section.button_border_width, brain ? 2 : 1),
    secondaryButtonBorderWidth: pixels(section.secondary_button_border_width, brain ? 2 : 1),
    fontFamily: !section.font_family || section.font_family === 'mono' ? mono : section.font_family === 'sans' ? 'Arial, Helvetica, sans-serif' : section.font_family,
    statement: hasBlockHtml ? statement : statement.replace(/\n[ \t]*\n+/g, '<br><br>'),
  };
}

module.exports = inlineCtaPresentation;
