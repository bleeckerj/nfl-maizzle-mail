// Footer fields are consumed by the social-card exporter, outside the email
// template scan. Keep blank starter copy and subtitle-font inheritance explicit.
export function socialCardFooterProperties() {
  return {
    footer: {
      type: ['string', 'null'],
      default: '',
      description: 'Optional social-card footer text, separate from the email footer. HTML is converted to plain text. Omitted, empty, or null values hide the footer. An explicitly supplied footer takes precedence over footerCopy.',
    },
    footerCopy: {
      type: ['string', 'null'],
      default: '',
      deprecated: true,
      description: 'Compatibility name for socialCard.footer. Existing sources remain supported; an explicitly supplied footer takes precedence, including empty or null values.',
    },
    footerFont: {
      type: ['string', 'null'],
      default: null,
      description: 'Font registry key for social-card footer copy. Omitted, empty, or null values inherit the resolved subtitle font.',
    },
    footerFontScale: {
      type: 'number',
      default: 1,
      description: 'Multiplier for the preset footer font size. Applies when footer text is present, authored through footer or footerCopy.',
    },
  };
}
