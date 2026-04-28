const DEFAULT_PRIMARY_CONTACT_URL = 'https://nearfuturelaboratory.com/contact';
const DEFAULT_PRIMARY_URL = 'https://nearfuturelaboratory.com'
const DEFAULT_PRIMARY_SERVICES_URL = 'https://nearfuturelaboratory.com/services';
const DEFAULT_SUPPORT_URL = 'https://patreon.com/nearfuturelaboratory';
const DEFAULT_VARIANT = 'default';

export const NEWSLETTER_FOOTER_CTA_VARIANTS = {
  default: {
    eyebrow: 'For Decisions That Are Still Taking Shape',
    text: 'I help leadership teams make possible futures tangible so they can see what they are actually committing to before the roadmap hardens.',
    primaryAction: {
      label: 'Start a Conversation',
      url: DEFAULT_PRIMARY_CONTACT_URL,
    },
    secondaryAction: {
      label: 'See How This Works',
      url: DEFAULT_PRIMARY_SERVICES_URL,
    },
  },
  advisory: {
    eyebrow: 'Strategic Support',
    text: 'I work with leadership, research, and innovation teams when the situation is still taking shape, the signals are noisy, and the next move matters.',
    primaryAction: {
      label: 'Explore Collaboration',
      url: DEFAULT_PRIMARY_SERVICES_URL,
    },
    secondaryAction: {
      label: 'See Selected Work',
      url: 'https://nearfuturelaboratory.com/projects',
    },
  },
  organization: {
    eyebrow: 'Bring This Into Your Organization',
    text: 'If this issue maps to something alive inside your organization, I can help your teams turn that kind of material into strategy, research frames, prototypes, and a clearer shared language.',
    primaryAction: {
      label: 'See How I Work',
      url: DEFAULT_PRIMARY_SERVICES_URL,
    },
    secondaryAction: {
      label: 'Start a Conversation',
      url: DEFAULT_PRIMARY_CONTACT_URL,
    },
  },
  workshop: {
    eyebrow: 'Workshops, Talks, Sessions',
    text: 'If you want to bring these themes into an offsite, workshop, or internal conversation, I design and facilitate sessions and artifacts that help a group think together more clearly.',
    primaryAction: {
      label: 'Book a Session',
      url: DEFAULT_PRIMARY_SERVICES_URL,
    },
    secondaryAction: {
      label: 'Start a Conversation',
      url: DEFAULT_PRIMARY_CONTACT_URL,
    },
  },
  research: {
    eyebrow: 'When The Signals Are Noisy',
    text: 'I help teams turn uncertainty, weak signals, and emerging technology questions into concrete artifacts that support better strategic decisions.',
    primaryAction: {
      label: 'Discuss a Project',
      url: DEFAULT_PRIMARY_CONTACT_URL,
    },
    secondaryAction: {
      label: 'See Selected Work',
      url: 'https://nearfuturelaboratory.com/projects',
    },
  },
};

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeAction(value, fallback) {
  if (value === false) return undefined;
  const record = isRecord(value) ? value : {};
  if (record.enabled === false) return undefined;

  const label = asNonEmptyString(record.label) ?? fallback?.label;
  const url = asNonEmptyString(record.url) ?? fallback?.url;
  if (!label || !url) return undefined;

  return { label, url };
}

function buildReminderSnippet(variant) {
  const preset = NEWSLETTER_FOOTER_CTA_VARIANTS[variant] || NEWSLETTER_FOOTER_CTA_VARIANTS[DEFAULT_VARIANT];
  const lines = [
    'footer:',
    '  footerCta:',
    `    variant: ${variant}`,
    `    eyebrow: "${preset.eyebrow}"`,
    `    text: "${preset.text}"`,
    '    primaryAction:',
    `      label: "${preset.primaryAction.label}"`,
    `      url: "${preset.primaryAction.url}"`,
  ];

  if (preset.secondaryAction) {
    lines.push('    secondaryAction:');
    lines.push(`      label: "${preset.secondaryAction.label}"`);
    lines.push(`      url: "${preset.secondaryAction.url}"`);
  }

  return lines.join('\n');
}

export function resolveNewsletterFooterCta(footerInput) {
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
    : preset.primaryAction);
  const secondaryAction = normalizeAction(rawFooterCta?.secondaryAction, preset.secondaryAction);

  const resolvedFooterCta = {
    enabled: true,
    variant,
    eyebrow: asNonEmptyString(rawFooterCta?.eyebrow) ?? preset.eyebrow,
    text: asNonEmptyString(rawFooterCta?.text) ?? preset.text,
    primaryAction,
    ...(secondaryAction ? { secondaryAction } : {}),
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
            snippet: buildReminderSnippet(variant),
          }
        : undefined,
  };
}
