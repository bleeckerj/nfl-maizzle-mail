const PLACEHOLDER_IMAGE = (width = 800, height = 600, text = 'Image') =>
  `https://fpoimg.com/${width}x${height}?text=${encodeURIComponent(text)}&bg_color=e6e6e6&text_color=4FAAAA`;

export function humanize(value) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^\w/, (character) => character.toUpperCase());
}

function normalizePropertyName(propName) {
  return propName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function inferTypeFromName(propName) {
  const name = normalizePropertyName(propName);
  if (name === 'sectionstylesfile' || name.endsWith('stylesinline')) return 'string';
  if (name.includes('styles') || name.includes('config') || name.includes('settings')) return 'object';
  if (name === 'items' || name === 'links' || name === 'images') return 'array';
  if (['enabled', 'flatten', 'loop'].includes(name)) return 'boolean';
  return 'string';
}

export function generateNumericPlaceholder(propName, propSchema, type) {
  const name = normalizePropertyName(propName);
  let value = 1;

  if (name === 'fps') value = 30;
  else if (name === 'durationms') value = 1000;
  else if (name.includes('duration')) value = 60;
  else if (name.includes('width')) value = name.includes('logo') ? 200 : 600;
  else if (name.includes('height')) value = name.includes('logo') ? 50 : 400;
  else if (name.includes('opacity') || name.includes('strength')) value = 0.5;
  else if (name.includes('brightness') || name.includes('saturation') || name.includes('fontscale')) value = 1;
  else if (name.includes('huerotate') || name === 'posterframe') value = 0;
  else if (name.includes('borderradius')) value = 8;
  else if (name.includes('borderwidth')) value = 1;
  else if (name.includes('padding') || name.includes('space') || name.includes('gap')) value = 16;

  if (Number.isFinite(propSchema.minimum)) value = Math.max(value, propSchema.minimum);
  if (Number.isFinite(propSchema.exclusiveMinimum)) {
    value = Math.max(value, propSchema.exclusiveMinimum + (type === 'integer' ? 1 : 0.01));
  }
  if (Number.isFinite(propSchema.maximum)) value = Math.min(value, propSchema.maximum);
  if (Number.isFinite(propSchema.exclusiveMaximum)) {
    value = Math.min(value, propSchema.exclusiveMaximum - (type === 'integer' ? 1 : 0.01));
  }
  if (Number.isFinite(propSchema.multipleOf) && propSchema.multipleOf > 0) {
    value = Math.ceil(value / propSchema.multipleOf) * propSchema.multipleOf;
  }

  return type === 'integer' ? Math.round(value) : value;
}

function isImageSourceProperty(name) {
  if (name.endsWith('href') || name.endsWith('link')) return false;
  return name === 'src'
    || name.endsWith('src')
    || name.endsWith('srcdesktop')
    || name.endsWith('srcmobile')
    || name === 'image'
    || name.endsWith('image')
    || name.endsWith('images')
    || name.startsWith('logoimage')
    || name === 'logo'
    || name.endsWith('logo')
    || name.endsWith('imageurl')
    || name.endsWith('logourl');
}

function isUrlProperty(name, propSchema) {
  return ['uri', 'uri-reference', 'url'].includes(propSchema.format)
    || name === 'href'
    || name === 'link'
    || name === 'url'
    || name.endsWith('href')
    || name.endsWith('link')
    || name.endsWith('url')
    || name === 'linkedinfollow';
}

function cssStringPlaceholder(name) {
  if (name.endsWith('stylesinline')) return 'color: #111111;';
  if (name === 'pricepositionstyle') return 'left: 5.4%; bottom: 5.4%;';
  if (name === 'iconpositionstyle') return 'right: 5.4%; bottom: 5.4%;';
  if (name.includes('backgroundgradient')) return 'linear-gradient(135deg, #ffffff 0%, #e6e6e6 100%)';
  if (name === 'border') return '1px solid #d1d5db';
  if (name.includes('border') && name.endsWith('style')) return 'solid';
  if ((name.includes('border') || name.includes('divider')) && name.endsWith('width')) return '1px';
  if (name.endsWith('borderradius')) return '8px';
  if (name.includes('padding') || name.startsWith('space') || name.endsWith('gap')) return '16px';
  if (name.endsWith('fontfamily')) return 'Arial, Helvetica, sans-serif';
  if (name.endsWith('fontsize')) return '16px';
  if (name.endsWith('lineheight')) return '1.5';
  if (name.endsWith('fontweight')) return '400';
  if (name.endsWith('fontstyle')) return 'normal';
  if (name.endsWith('textalign')) return 'left';
  if (name.endsWith('texttransform')) return 'none';
  if (name.endsWith('letterspacing')) return '0';
  if (name.endsWith('color')) {
    if (name.includes('muted')) return '#666666';
    if (name.includes('accent')) return '#4faaaa';
    if (name.includes('background') || name.includes('surface')) return '#ffffff';
    if (name.includes('border') || name.includes('divider')) return '#d1d5db';
    return '#111111';
  }
  if (name.endsWith('background')) return name.includes('button') ? '#111111' : '#ffffff';
  if (name.endsWith('width')) return name.includes('logo') ? '200' : '600';
  if (name.endsWith('height')) return name.includes('logo') ? '50' : '400';
  return null;
}

export function generateStringPlaceholder(propName, propSchema = {}, context = {}) {
  const name = propName.toLowerCase();
  const normalizedName = normalizePropertyName(propName);
  const description = propSchema.description || '';

  if (normalizedName === 'alt' || normalizedName.endsWith('alt') || normalizedName.endsWith('alttext')) {
    if (normalizedName === 'ogimagealttext') return 'Open graph preview image for this newsletter';
    return 'Image description for accessibility';
  }

  if (normalizedName === 'adid') return 'example-ad-id';
  if (normalizedName === 'shorttakeid') return 'example-short-take-id';
  if (normalizedName === 'jobref') return 'jobs/example-role';
  if (normalizedName === 'issueid') return 'w01-y26';
  if (normalizedName === 'slug') return 'example-item';
  if (normalizedName === 'id') return 'example-id';
  if (normalizedName === 'aspectratio') return '4 / 3';
  if (normalizedName === 'timezone') return 'America/Los_Angeles';
  if (normalizedName === 'publicationmode') return 'public-issue';
  if (normalizedName === 'newsletterformat') return 'discovery';
  if (normalizedName === 'colortheme') return 'professional';
  if (normalizedName === 'sectionstylesfile') {
    return `templates/${context.templateName || 'template'}/section-styles.json`;
  }
  if (name === '$schema') return 'https://json-schema.org/draft-07/schema#';

  if (['date', 'pubdate'].includes(normalizedName) || normalizedName.endsWith('issuedate')) {
    return propSchema.format === 'date-time' ? '2026-01-01T10:00:00-08:00' : '2026-01-01';
  }
  if (['start', 'startsat'].includes(normalizedName)) return '2026-01-01T10:00:00-08:00';
  if (['end', 'endsat'].includes(normalizedName)) return '2026-01-01T11:00:00-08:00';
  if (normalizedName === 'displaydate' || normalizedName === 'dateline') return 'January 1, 2026';
  if (normalizedName === 'displaytime') return '10:00 AM';
  if (normalizedName === 'displayweekday') return 'Thursday';
  if (propSchema.format === 'date-time') return '2026-01-01T10:00:00-08:00';
  if (propSchema.format === 'date') return '2026-01-01';
  if (propSchema.format === 'time') return '10:00:00-08:00';

  if (normalizedName.endsWith('html')) {
    return `<p>Example ${humanize(propName.replace(/_?html$/i, ''))} content.</p>`;
  }

  const cssPlaceholder = cssStringPlaceholder(normalizedName);
  if (cssPlaceholder !== null) return cssPlaceholder;

  if (
    normalizedName.endsWith('readmoretext')
    || normalizedName.endsWith('readmoretxt')
    || normalizedName.endsWith('linktext')
  ) return 'Read more →';
  if (normalizedName.endsWith('ctalabel') || normalizedName === 'ctatext') return 'Read more';

  if (isImageSourceProperty(normalizedName)) {
    const width = normalizedName.includes('logo') ? 200 : 800;
    const height = normalizedName.includes('logo') ? 50 : 600;
    return PLACEHOLDER_IMAGE(width, height, humanize(propName));
  }

  if (isUrlProperty(normalizedName, propSchema)) {
    if (normalizedName.includes('unsubscribe')) return '[unsubscribe]';
    if (normalizedName.includes('email')) return 'mailto:?subject=Newsletter&body=Check%20this%20out';
    return 'https://nearfuturelaboratory.com';
  }

  if (name === 'preheader') return 'Short preview text that appears in email clients';
  if (name === 'title') return 'Newsletter Title';
  if (name === 'description' || name === 'content' || name === 'body') {
    return `<p>Example ${humanize(propName)} content.</p>`;
  }
  if (name === 'quote') return 'An inspiring quote or thought-provoking statement';
  if (name === 'author' || name === 'authorname') return 'Author Name';
  if (name === 'name') return 'Example Name';
  if (normalizedName === 'email' || normalizedName === 'emailshare') {
    return 'mailto:?subject=Newsletter&body=Check%20this%20out';
  }
  if (name === 'address') return '© 2025 Your Company<br>City, State<br>Country';
  if (name === 'subtitle' || name === 'category' || name === 'channel') return `Example ${humanize(propName)}`;
  if (name.includes('callout')) return 'Important callout text that draws attention';

  return description || `Example ${humanize(propName)}`;
}
