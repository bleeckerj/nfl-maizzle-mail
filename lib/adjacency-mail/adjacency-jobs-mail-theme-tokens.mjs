const SERIF_FONT = "Georgia, 'Times New Roman', serif";
const SANS_FONT = "'IBM Plex Sans', Roboto, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO_FONT = "'Share Tech Mono', 'Courier New', Courier, monospace";
const APPLE_SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const GEO_SANS = "Arial, Helvetica, sans-serif";
const FUTURAISH_SANS = "Futura, 'Trebuchet MS', Arial, sans-serif";

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (!isObject(base) || !isObject(override)) {
    return override === undefined ? base : override;
  }

  const merged = { ...base };
  Object.entries(override).forEach(([key, value]) => {
    merged[key] = isObject(value) && isObject(base[key]) ? deepMerge(base[key], value) : value;
  });
  return merged;
}

function typographyOnly(styles) {
  const keys = [
    'fontFamily',
    'fontSize',
    'lineHeight',
    'fontWeight',
    'fontStyle',
    'color',
    'letterSpacing',
    'textTransform',
    'textAlign',
    'textDecoration',
  ];

  return Object.fromEntries(
    Object.entries(styles).filter(([key, value]) => keys.includes(key) && value !== undefined && value !== null && value !== ''),
  );
}

export function inlineStylesToString(styles = {}, important = false) {
  return Object.entries(styles)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([property, value]) => {
      const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssProperty}: ${value}${important ? ' !important' : ''}`;
    })
    .join('; ');
}

function styleAttr(styles = {}, important = false) {
  const inline = inlineStylesToString(styles, important);
  return inline ? ` style="${inline.replace(/"/g, '&quot;')}"` : '';
}

const baseProseText = {
  fontFamily: SANS_FONT,
  fontSize: '16px',
  lineHeight: '1.6',
  fontWeight: '400',
  color: '#14181f',
  textAlign: 'left',
};

export const adjacencyJobsMailThemeTokens = {
  defaultVariant: 'adjacency-jobs-default',
  variants: {
    'adjacency-jobs-default': {
      layout: {
        metaPresentation: 'chips',
      },
      shell: {
        backgroundColor: '#ffffff',
        borderColor: '#d9d4c8',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderRadius: '0px',
      },
      header: {
        backgroundColor: '#f5f1ea',
      },
      headerInner: {
        padding: '20px',
      },
      companyRow: {
        verticalAlign: 'middle',
      },
      companyIcon: {
        display: 'block',
        width: '56px',
        maxWidth: '56px',
        height: 'auto',
        border: '0',
      },
      company: {
        fontFamily: MONO_FONT,
        fontSize: '12px',
        lineHeight: '1.4',
        fontWeight: '400',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#5a6476',
      },
      companyTagline: {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        lineHeight: '1.45',
        color: '#5f6878',
      },
      title: {
        fontFamily: SERIF_FONT,
        fontSize: '34px',
        lineHeight: '1.08',
        fontWeight: '700',
        color: '#111111',
      },
      metaRow: {
        marginTop: '14px',
      },
      metaChip: {
        display: 'inline-block',
        margin: '0 8px 8px 0',
        padding: '6px 10px',
        border: '1px solid #d9d4c8',
        backgroundColor: '#ffffff',
        fontFamily: MONO_FONT,
        fontSize: '11px',
        lineHeight: '1.35',
        color: '#4f596b',
      },
      ctaPrimary: {
        display: 'inline-block',
        padding: '12px 18px',
        border: '1px solid #111111',
        backgroundColor: '#111111',
        color: '#ffffff',
        fontFamily: SANS_FONT,
        fontSize: '14px',
        lineHeight: '1.2',
        fontWeight: '700',
        textDecoration: 'none',
      },
      ctaSecondary: {
        display: 'inline-block',
        padding: '12px 18px',
        border: '1px solid #c7c1b4',
        backgroundColor: '#ffffff',
        color: '#222831',
        fontFamily: SANS_FONT,
        fontSize: '14px',
        lineHeight: '1.2',
        fontWeight: '600',
        textDecoration: 'none',
      },
      tagsRow: {
        marginTop: '10px',
      },
      tag: {
        display: 'inline-block',
        margin: '0 6px 6px 0',
        padding: '4px 9px',
        border: '1px solid #d9d4c8',
        fontFamily: MONO_FONT,
        fontSize: '11px',
        lineHeight: '1.3',
        color: '#5a6476',
        textTransform: 'uppercase',
      },
      contentSection: {
        padding: '18px 20px 0 20px',
        backgroundColor: '#ffffff',
      },
      sectionHeading: {
        fontFamily: SANS_FONT,
        fontSize: '14px',
        lineHeight: '1.4',
        fontWeight: '700',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#556072',
      },
      divider: {
        borderTop: '1px solid #e4ded2',
      },
      list: {
        margin: '0 0 0 18px',
        padding: '0',
        ...baseProseText,
      },
      listItem: {
        margin: '0 0 10px 0',
        padding: '0',
      },
      compensationBox: {
        padding: '16px 18px',
        backgroundColor: '#f7f4ee',
        border: '1px solid #d9d4c8',
      },
      footerNotesBox: {
        padding: '16px 18px',
        backgroundColor: '#f7f4ee',
        border: '1px solid #d9d4c8',
      },
      sourceLink: {
        fontFamily: MONO_FONT,
        fontSize: '11px',
        lineHeight: '1.4',
        color: '#4d5a72',
        textDecoration: 'underline',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      },
      prose: {
        link: {
          color: '#44506a',
          textDecoration: 'underline',
        },
        paragraph: {
          margin: '0 0 16px 0',
          padding: '0',
          ...baseProseText,
        },
        headings: {
          h1: {
            margin: '24px 0 12px 0',
            padding: '0',
            fontFamily: SANS_FONT,
            fontSize: '24px',
            lineHeight: '1.2',
            fontWeight: '700',
            color: '#111111',
          },
          h2: {
            margin: '24px 0 12px 0',
            padding: '0',
            fontFamily: SANS_FONT,
            fontSize: '22px',
            lineHeight: '1.24',
            fontWeight: '700',
            color: '#111111',
          },
          h3: {
            margin: '20px 0 10px 0',
            padding: '0',
            fontFamily: SANS_FONT,
            fontSize: '18px',
            lineHeight: '1.28',
            fontWeight: '700',
            color: '#111111',
          },
        },
        blockquote: {
          margin: '18px 0',
          padding: '0 0 0 14px',
          borderLeft: '3px solid #d9d4c8',
          fontFamily: SERIF_FONT,
          fontSize: '17px',
          lineHeight: '1.6',
          fontStyle: 'italic',
          color: '#2f3847',
        },
        lists: {
          ul: {
            margin: '0 0 16px 20px',
            padding: '0',
            ...baseProseText,
          },
          ol: {
            margin: '0 0 16px 20px',
            padding: '0',
            ...baseProseText,
          },
          item: {
            margin: '0 0 10px 0',
            padding: '0',
          },
        },
        hr: {
          border: '0',
          borderTop: '1px solid #e4ded2',
          margin: '24px 0',
        },
        pre: {
          margin: '0 0 16px 0',
          padding: '12px',
          background: '#f3efe7',
          border: '1px solid #d9d4c8',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: MONO_FONT,
          fontSize: '13px',
          lineHeight: '1.5',
          color: '#1e2430',
        },
        code: {
          fontFamily: MONO_FONT,
          fontSize: '13px',
          background: '#f3efe7',
          padding: '1px 3px',
        },
      },
    },
    openai: {
      title: { fontFamily: SANS_FONT, fontSize: '36px' },
      company: { fontFamily: SANS_FONT, fontWeight: '700', letterSpacing: '0.06em' },
      header: { backgroundColor: '#f7f7f8' },
      metaChip: { backgroundColor: '#ffffff', border: '1px solid #d7dae0', color: '#3d4653' },
      sectionHeading: { fontFamily: SANS_FONT, color: '#0c0c0d' },
      ctaPrimary: { backgroundColor: '#0d0d0f', border: '1px solid #0d0d0f' },
      ctaSecondary: { border: '1px solid #d7dae0' },
      compensationBox: { backgroundColor: '#f7f7f8', border: '1px solid #d7dae0' },
      footerNotesBox: { backgroundColor: '#f7f7f8', border: '1px solid #d7dae0' },
      prose: {
        paragraph: { fontFamily: SANS_FONT, color: '#0f141c' },
        headings: {
          h1: { fontFamily: SANS_FONT },
          h2: { fontFamily: SANS_FONT },
          h3: { fontFamily: SANS_FONT },
        },
        lists: {
          ul: { fontFamily: SANS_FONT, color: '#0f141c' },
          ol: { fontFamily: SANS_FONT, color: '#0f141c' },
        },
      },
    },
    anthropic: {
      layout: { metaPresentation: 'rows' },
      shell: { backgroundColor: '#faf9f5', borderColor: '#e3dacc' },
      header: { backgroundColor: '#f5f1e8' },
      company: { fontFamily: GEO_SANS, color: '#8d5238' },
      companyTagline: { fontFamily: GEO_SANS, color: '#64574e' },
      title: { fontFamily: GEO_SANS, fontSize: '34px', color: '#141413' },
      sectionHeading: { fontFamily: GEO_SANS, color: '#141413' },
      ctaPrimary: { backgroundColor: '#141413', border: '1px solid #141413' },
      ctaSecondary: { border: '1px solid #cdbfae', color: '#141413' },
      compensationBox: { backgroundColor: '#f1ece1', border: '1px solid #d8cbb9' },
      footerNotesBox: { backgroundColor: '#f1ece1', border: '1px solid #d8cbb9' },
      prose: {
        paragraph: { fontFamily: SERIF_FONT, color: '#232320' },
        headings: {
          h1: { fontFamily: GEO_SANS, color: '#141413' },
          h2: { fontFamily: GEO_SANS, color: '#141413' },
          h3: { fontFamily: GEO_SANS, color: '#141413' },
        },
        blockquote: { borderLeft: '3px solid #d97757', color: '#4f4037' },
      },
    },
    googledeepmindish: {
      layout: { metaPresentation: 'rows' },
      title: { fontFamily: GEO_SANS, color: '#202124' },
      company: { fontFamily: GEO_SANS, color: '#1a73e8', letterSpacing: '0.08em' },
      header: { backgroundColor: '#ffffff' },
      shell: { borderColor: '#d2e3fc' },
      sectionHeading: { fontFamily: GEO_SANS, color: '#202124' },
      ctaPrimary: { backgroundColor: '#1a73e8', border: '1px solid #1a73e8' },
      ctaSecondary: { border: '1px solid #a8c7fa', color: '#1967d2' },
      compensationBox: { backgroundColor: '#f7faff', border: '1px solid #d2e3fc' },
      footerNotesBox: { backgroundColor: '#f7faff', border: '1px solid #d2e3fc' },
      prose: {
        paragraph: { fontFamily: GEO_SANS, color: '#202124' },
        headings: {
          h1: { fontFamily: GEO_SANS, color: '#202124' },
          h2: { fontFamily: GEO_SANS, color: '#202124' },
          h3: { fontFamily: GEO_SANS, color: '#202124' },
        },
      },
    },
    atlassian: {
      title: { fontFamily: SANS_FONT, color: '#172b4d' },
      company: { color: '#0052cc' },
      header: { backgroundColor: '#ebf2ff' },
      ctaPrimary: { backgroundColor: '#0052cc', border: '1px solid #0052cc' },
      ctaSecondary: { border: '1px solid #b3d4ff', color: '#0052cc' },
    },
    ableton: {
      layout: { metaPresentation: 'rows' },
      title: { fontFamily: FUTURAISH_SANS, color: '#111111' },
      company: { fontFamily: FUTURAISH_SANS, color: '#111111' },
      sectionHeading: { fontFamily: FUTURAISH_SANS, color: '#111111' },
      ctaPrimary: { backgroundColor: '#111111', border: '1px solid #111111' },
      prose: {
        paragraph: { fontFamily: FUTURAISH_SANS, color: '#111111' },
        headings: {
          h1: { fontFamily: FUTURAISH_SANS, color: '#111111' },
          h2: { fontFamily: FUTURAISH_SANS, color: '#111111' },
          h3: { fontFamily: FUTURAISH_SANS, color: '#111111' },
        },
      },
    },
    comfyui: {
      shell: { backgroundColor: '#0f1015', borderColor: '#2d2f3b' },
      header: { backgroundColor: '#151823' },
      company: { color: '#8b5cf6' },
      companyTagline: { color: '#a8b0c3' },
      title: { fontFamily: SANS_FONT, color: '#fafafa' },
      metaChip: { backgroundColor: '#141823', border: '1px solid #2d2f3b', color: '#d0d7e6' },
      sectionHeading: { color: '#c2cae0' },
      ctaPrimary: { backgroundColor: '#8b5cf6', border: '1px solid #8b5cf6', color: '#ffffff' },
      ctaSecondary: { backgroundColor: '#0f1015', border: '1px solid #2d2f3b', color: '#d0d7e6' },
      contentSection: { backgroundColor: '#0f1015' },
      compensationBox: { backgroundColor: '#141823', border: '1px solid #2d2f3b' },
      footerNotesBox: { backgroundColor: '#141823', border: '1px solid #2d2f3b' },
      tag: { border: '1px solid #2d2f3b', color: '#c2cae0' },
      sourceLink: { color: '#8dd3ff' },
      prose: {
        link: { color: '#8dd3ff', textDecoration: 'underline' },
        paragraph: { fontFamily: SANS_FONT, color: '#edf1f7' },
        headings: {
          h1: { fontFamily: MONO_FONT, color: '#fafafa' },
          h2: { fontFamily: MONO_FONT, color: '#fafafa' },
          h3: { fontFamily: MONO_FONT, color: '#fafafa' },
        },
        blockquote: { borderLeft: '3px solid #8b5cf6', color: '#d0d7e6' },
        lists: {
          ul: { fontFamily: SANS_FONT, color: '#edf1f7' },
          ol: { fontFamily: SANS_FONT, color: '#edf1f7' },
        },
        pre: { background: '#11131b', border: '1px solid #2d2f3b', color: '#edf1f7' },
        code: { background: '#11131b', color: '#edf1f7' },
      },
    },
    thenewyorkerish: {
      title: { fontFamily: SERIF_FONT, color: '#111111' },
      company: { fontFamily: SANS_FONT, color: '#111111' },
      sectionHeading: { fontFamily: SANS_FONT, color: '#111111' },
      prose: {
        paragraph: { fontFamily: SERIF_FONT, fontSize: '17px', lineHeight: '1.7', color: '#111111' },
        headings: {
          h1: { fontFamily: SERIF_FONT, color: '#111111' },
          h2: { fontFamily: SERIF_FONT, color: '#111111' },
          h3: { fontFamily: SERIF_FONT, color: '#111111' },
        },
      },
    },
    x: {
      title: { fontFamily: APPLE_SANS, color: '#0f1419' },
      company: { fontFamily: APPLE_SANS, color: '#0f1419' },
      shell: { borderColor: '#dbe1ea' },
      header: { backgroundColor: '#f7f9f9' },
      ctaPrimary: { backgroundColor: '#0f1419', border: '1px solid #0f1419' },
      ctaSecondary: { border: '1px solid #dbe1ea' },
    },
    kohler: {
      title: { fontFamily: GEO_SANS, color: '#2e2a24' },
      company: { color: '#7a5a2f' },
      header: { backgroundColor: '#f6f2ea' },
      compensationBox: { backgroundColor: '#f6f2ea', border: '1px solid #dccfb8' },
      footerNotesBox: { backgroundColor: '#f6f2ea', border: '1px solid #dccfb8' },
    },
    mcdonalds: {
      title: { fontFamily: GEO_SANS, color: '#1f1f1f' },
      company: { color: '#da291c' },
      header: { backgroundColor: '#fff4d6' },
      ctaPrimary: { backgroundColor: '#da291c', border: '1px solid #da291c' },
      ctaSecondary: { border: '1px solid #ffc72c', color: '#1f1f1f', backgroundColor: '#ffffff' },
    },
    netflix: {
      title: { fontFamily: APPLE_SANS, color: '#ffffff' },
      company: { color: '#e50914' },
      shell: { backgroundColor: '#141414', borderColor: '#2b2b2b' },
      header: { backgroundColor: '#141414' },
      metaChip: { backgroundColor: '#1f1f1f', border: '1px solid #2b2b2b', color: '#f5f5f5' },
      contentSection: { backgroundColor: '#141414' },
      ctaPrimary: { backgroundColor: '#e50914', border: '1px solid #e50914' },
      ctaSecondary: { backgroundColor: '#141414', border: '1px solid #4b4b4b', color: '#f5f5f5' },
      compensationBox: { backgroundColor: '#1f1f1f', border: '1px solid #2b2b2b' },
      footerNotesBox: { backgroundColor: '#1f1f1f', border: '1px solid #2b2b2b' },
      tag: { border: '1px solid #4b4b4b', color: '#c9c9c9' },
      sourceLink: { color: '#e50914' },
      prose: {
        link: { color: '#ffffff', textDecoration: 'underline' },
        paragraph: { fontFamily: SANS_FONT, color: '#f5f5f5' },
        headings: {
          h1: { fontFamily: APPLE_SANS, color: '#ffffff' },
          h2: { fontFamily: APPLE_SANS, color: '#ffffff' },
          h3: { fontFamily: APPLE_SANS, color: '#ffffff' },
        },
        blockquote: { borderLeft: '3px solid #e50914', color: '#f5f5f5' },
        lists: {
          ul: { fontFamily: SANS_FONT, color: '#f5f5f5' },
          ol: { fontFamily: SANS_FONT, color: '#f5f5f5' },
        },
      },
    },
    ey: {
      title: { fontFamily: GEO_SANS, color: '#111111' },
      company: { color: '#2f2f2f' },
      header: { backgroundColor: '#fbf8e8' },
      ctaPrimary: { backgroundColor: '#2f2f2f', border: '1px solid #2f2f2f' },
      ctaSecondary: { border: '1px solid #ffe600', color: '#2f2f2f' },
    },
    appleish: {
      title: { fontFamily: APPLE_SANS, color: '#1d1d1f' },
      company: { fontFamily: APPLE_SANS, color: '#6e6e73' },
      companyTagline: { fontFamily: APPLE_SANS, color: '#6e6e73' },
      sectionHeading: { fontFamily: APPLE_SANS, color: '#1d1d1f' },
      ctaPrimary: { backgroundColor: '#0071e3', border: '1px solid #0071e3' },
      ctaSecondary: { border: '1px solid #d2d2d7', color: '#1d1d1f' },
      prose: {
        paragraph: { fontFamily: APPLE_SANS, color: '#1d1d1f' },
        headings: {
          h1: { fontFamily: APPLE_SANS, color: '#1d1d1f' },
          h2: { fontFamily: APPLE_SANS, color: '#1d1d1f' },
          h3: { fontFamily: APPLE_SANS, color: '#1d1d1f' },
        },
        lists: {
          ul: { fontFamily: APPLE_SANS, color: '#1d1d1f' },
          ol: { fontFamily: APPLE_SANS, color: '#1d1d1f' },
        },
      },
    },
  },
};

export function resolveAdjacencyJobsMailVariantTokens(brandVariant = adjacencyJobsMailThemeTokens.defaultVariant) {
  const base = adjacencyJobsMailThemeTokens.variants[adjacencyJobsMailThemeTokens.defaultVariant];
  const override = adjacencyJobsMailThemeTokens.variants[brandVariant] || {};
  return deepMerge(base, override);
}

export function styleAdjacencyJobsMailHtmlFragment(html, proseTheme) {
  if (!html || typeof html !== 'string') return html;

  return String(html)
    .replace(/<a href="([^"]+)">/gi, `<a href="$1"${styleAttr(proseTheme.link, true)}>`)
    .replace(/<p>/gi, `<p${styleAttr(proseTheme.paragraph)}>`)
    .replace(/<h1>/gi, `<h1${styleAttr(proseTheme.headings.h1)}>`)
    .replace(/<h2>/gi, `<h2${styleAttr(proseTheme.headings.h2)}>`)
    .replace(/<h3>/gi, `<h3${styleAttr(proseTheme.headings.h3)}>`)
    .replace(/<blockquote>/gi, `<blockquote${styleAttr(proseTheme.blockquote)}>`)
    .replace(/<ul>/gi, `<ul${styleAttr(proseTheme.lists.ul)}>`)
    .replace(/<ol>/gi, `<ol${styleAttr(proseTheme.lists.ol)}>`)
    .replace(/<li>/gi, `<li${styleAttr(proseTheme.lists.item)}>`)
    .replace(/<hr\s*\/?>/gi, `<hr${styleAttr(proseTheme.hr)}>`)
    .replace(/<pre>/gi, `<pre${styleAttr(proseTheme.pre)}>`)
    .replace(/<code class="[^"]*">/gi, `<code${styleAttr(proseTheme.code)}>`)
    .replace(/<code>/gi, `<code${styleAttr(proseTheme.code)}>`);
}

export function styleAdjacencyJobsMailInlineHtml(html, proseTheme) {
  if (!html || typeof html !== 'string' || !html.trim()) return '';
  return String(html).replace(/<a href="([^"]+)">/gi, `<a href="$1"${styleAttr(proseTheme.link, true)}>`);
}

export function buildAdjacencyJobsMailSectionStyleOverrides() {
  const tokens = resolveAdjacencyJobsMailVariantTokens();

  return {
    'adjacency-job-posting': {
      name: 'Adjacency Job Posting',
      description: 'Structured branded job-post email section resolved from Adjacency jobs mail theme tokens',
      containerStyles: {
        backgroundColor: tokens.shell.backgroundColor,
        borderColor: tokens.shell.borderColor,
        borderWidth: tokens.shell.borderWidth,
        borderStyle: tokens.shell.borderStyle,
        borderRadius: tokens.shell.borderRadius,
      },
      contentStyles: typographyOnly(tokens.prose.paragraph),
      linkStyles: typographyOnly(tokens.sourceLink),
      headingStyles: typographyOnly(tokens.title),
      labelStyles: typographyOnly(tokens.company),
    },
  };
}
