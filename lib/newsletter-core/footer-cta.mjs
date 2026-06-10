const DEFAULT_PRIMARY_CONTACT_URL = 'https://nearfuturelaboratory.com/contact';
const DEFAULT_PRIMARY_URL = 'https://nearfuturelaboratory.com'
const DEFAULT_PRIMARY_SERVICES_URL = 'https://nearfuturelaboratory.com/services';
const DEFAULT_SUPPORT_URL = 'https://patreon.com/nearfuturelaboratory';
const DEFAULT_VARIANT = 'default';
const DEFAULT_TRACKING_ENTITY = 'Near Future Laboratory';
const DEFAULT_TRACKING_CATEGORY = 'services';

function buildTrackedFooterCtaUrl(href, action) {
  return {
    href,
    label: `footer CTA | ${action} | ${DEFAULT_TRACKING_ENTITY}`,
    category: DEFAULT_TRACKING_CATEGORY,
  };
}

export const NEWSLETTER_FOOTER_CTA_VARIANTS = {
  default: {
    eyebrow: 'Commissions, Collaborations, Integrated Roles',
    text: "Organizations get really good at reproducing the world they already understand. Near Future Laboratory helps teams surface their unspoken inherited assumptions and explore alternative possibilities through artifacts from possible futures. If you're looking to get out of that loop, let's talk.",
    primaryAction: {
      label: 'Let’s Talk',
      url: buildTrackedFooterCtaUrl(DEFAULT_PRIMARY_CONTACT_URL, 'contact'),
    },
    secondaryAction: {
      label: 'See How I Work',
      url: buildTrackedFooterCtaUrl(DEFAULT_PRIMARY_SERVICES_URL, 'services'),
    },
  },
  advisory: {
    eyebrow: 'Strategic Support',
    text: 'I work with leadership, research, and innovation teams when the situation is still taking shape, the signals are noisy, and the next move matters.',
    primaryAction: {
      label: 'Explore Collaboration',
      url: buildTrackedFooterCtaUrl(DEFAULT_PRIMARY_SERVICES_URL, 'services'),
    },
    secondaryAction: {
      label: 'See Selected Work',
      url: buildTrackedFooterCtaUrl('https://nearfuturelaboratory.com/projects', 'projects'),
    },
  },
  organization: {
    eyebrow: 'Bring This Into Your Organization',
    text: 'If this issue maps to something alive inside your organization, I can help your teams turn that kind of material into strategy, research frames, prototypes, and a clearer shared language.',
    primaryAction: {
      label: 'See How I Work',
      url: buildTrackedFooterCtaUrl(DEFAULT_PRIMARY_SERVICES_URL, 'services'),
    },
    secondaryAction: {
      label: 'Start a Conversation',
      url: buildTrackedFooterCtaUrl(DEFAULT_PRIMARY_CONTACT_URL, 'contact'),
    },
  },
  workshop: {
    eyebrow: 'Workshops, Talks, Sessions',
    text: 'If you want to bring these themes into an offsite, workshop, or internal conversation, I design and facilitate sessions and artifacts that help a group think together more clearly.',
    primaryAction: {
      label: 'Book a Session',
      url: buildTrackedFooterCtaUrl(DEFAULT_PRIMARY_SERVICES_URL, 'services'),
    },
    secondaryAction: {
      label: 'Start a Conversation',
      url: buildTrackedFooterCtaUrl(DEFAULT_PRIMARY_CONTACT_URL, 'contact'),
    },
  },
  research: {
    eyebrow: 'When The Signals Are Noisy',
    text: 'I help teams turn uncertainty, weak signals, and emerging technology questions into concrete artifacts that support better strategic decisions.',
    primaryAction: {
      label: 'Discuss a Project',
      url: buildTrackedFooterCtaUrl(DEFAULT_PRIMARY_CONTACT_URL, 'contact'),
    },
    secondaryAction: {
      label: 'See Selected Work',
      url: buildTrackedFooterCtaUrl('https://nearfuturelaboratory.com/projects', 'projects'),
    },
  },
};

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function withIssueTrackingLabel(url, issueId) {
  if (!isRecord(url)) return url;
  const resolvedIssueId = asNonEmptyString(issueId);
  const label = asNonEmptyString(url.label);
  if (!resolvedIssueId || !label || label.startsWith(`${resolvedIssueId} |`)) return url;

  return {
    ...url,
    label: `${resolvedIssueId} | ${label}`,
  };
}

function normalizeActionUrl(url, fallbackUrl, issueId, { explicitObjectUrl = false } = {}) {
  if (!url) return undefined;

  if (isRecord(url)) {
    return explicitObjectUrl ? url : withIssueTrackingLabel(url, issueId);
  }

  if (isRecord(fallbackUrl)) {
    const trackedFallbackUrl = withIssueTrackingLabel(fallbackUrl, issueId);
    return {
      ...trackedFallbackUrl,
      href: url,
    };
  }

  return url;
}

function asActionUrl(value) {
  const stringUrl = asNonEmptyString(value);
  if (stringUrl) return stringUrl;

  if (isRecord(value)) {
    const href = asNonEmptyString(value.href) ?? asNonEmptyString(value.url);
    if (href) return value;
  }

  return undefined;
}

function normalizeAction(value, fallback, { issueId } = {}) {
  if (value === false) return undefined;
  const record = isRecord(value) ? value : {};
  if (record.enabled === false) return undefined;

  const label = asNonEmptyString(record.label) ?? fallback?.label;
  const rawUrl = asActionUrl(record.url);
  const fallbackUrl = asActionUrl(fallback?.url);
  const url = normalizeActionUrl(rawUrl ?? fallbackUrl, fallbackUrl, issueId, {
    explicitObjectUrl: isRecord(rawUrl),
  });
  if (!label || !url) return undefined;

  return { label, url };
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ''));
}

function pushActionUrlSnippet(lines, url, issueId) {
  const trackedUrl = withIssueTrackingLabel(url, issueId);
  if (isRecord(trackedUrl)) {
    lines.push('      url:');
    lines.push(`        href: ${trackedUrl.href}`);
    if (trackedUrl.label) lines.push(`        label: ${yamlString(trackedUrl.label)}`);
    if (trackedUrl.category) lines.push(`        category: ${trackedUrl.category}`);
    return;
  }

  lines.push(`      url: ${trackedUrl}`);
}

function pushActionSnippet(lines, actionKey, action, issueId) {
  lines.push(`    ${actionKey}:`);
  lines.push(`      label: ${yamlString(action.label)}`);
  pushActionUrlSnippet(lines, action.url, issueId);
}

function buildReminderSnippet(variant, issueId) {
  const preset = NEWSLETTER_FOOTER_CTA_VARIANTS[variant] || NEWSLETTER_FOOTER_CTA_VARIANTS[DEFAULT_VARIANT];
  const lines = [
    'footer:',
    '  footerCta:',
    `    variant: ${variant}`,
    `    eyebrow: ${yamlString(preset.eyebrow)}`,
    `    text: ${yamlString(preset.text)}`,
  ];

  pushActionSnippet(lines, 'primaryAction', preset.primaryAction, issueId);

  if (preset.secondaryAction) {
    pushActionSnippet(lines, 'secondaryAction', preset.secondaryAction, issueId);
  }

  return lines.join('\n');
}

export function resolveNewsletterFooterCta(footerInput, { issueId } = {}) {
  const footer = isRecord(footerInput) ? structuredClone(footerInput) : {};
  const rawFooterCta = isRecord(footer.footerCta) ? footer.footerCta : undefined;
  const legacyLabel = asNonEmptyString(footer.workCtaLabel);
  const legacyUrl = asNonEmptyString(footer.workCtaUrl);

  if (rawFooterCta?.enabled === false) {
    return {
      footer: { ...footer, footerCta: { enabled: false } },
      footerCtaSource: 'disabled',
      reminder: undefined,
    };
  }

  const requestedVariant = asNonEmptyString(rawFooterCta?.variant);
  const variant = requestedVariant && NEWSLETTER_FOOTER_CTA_VARIANTS[requestedVariant]
    ? requestedVariant
    : DEFAULT_VARIANT;
  const preset = NEWSLETTER_FOOTER_CTA_VARIANTS[variant];

  const primaryAction = normalizeAction(rawFooterCta?.primaryAction, legacyLabel || legacyUrl
    ? {
        label: legacyLabel ?? preset.primaryAction.label,
        url: legacyUrl ?? preset.primaryAction.url,
      }
    : preset.primaryAction, { issueId });
  const secondaryAction = normalizeAction(rawFooterCta?.secondaryAction, preset.secondaryAction, { issueId });

  const background = asNonEmptyString(rawFooterCta?.background);
  const textColor = asNonEmptyString(rawFooterCta?.text_color);
  const eyebrowColor = asNonEmptyString(rawFooterCta?.eyebrow_color);
  const heavyTopBorder = rawFooterCta?.heavy_top_border === true;

  const resolvedFooterCta = {
    enabled: true,
    variant,
    eyebrow: asNonEmptyString(rawFooterCta?.eyebrow) ?? preset.eyebrow,
    text: asNonEmptyString(rawFooterCta?.text) ?? preset.text,
    primaryAction,
    ...(secondaryAction ? { secondaryAction } : {}),
    // Optional appearance overrides (mirror the share_this section). Passed
    // through only when set so the template can apply its own defaults.
    ...(background ? { background } : {}),
    ...(textColor ? { text_color: textColor } : {}),
    ...(eyebrowColor ? { eyebrow_color: eyebrowColor } : {}),
    ...(heavyTopBorder ? { heavy_top_border: true } : {}),
  };

  let footerCtaSource = 'configured';
  if (!rawFooterCta) {
    footerCtaSource = legacyLabel || legacyUrl ? 'legacy' : 'default';
  }

  return {
    footer: {
      ...footer,
      footerCta: resolvedFooterCta,
    },
    footerCtaSource,
    reminder:
      footerCtaSource === 'default'
        ? {
            variant,
            snippet: buildReminderSnippet(variant, issueId),
          }
        : undefined,
  };
}
