function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferYearFromIssueId(issueId) {
  const match = /(?:^|-)y(\d{2}|\d{4})(?:\b|$)/i.exec(String(issueId || ''));
  if (!match) return null;
  const raw = match[1];
  return raw.length === 4 ? Number(raw) : 2000 + Number(raw);
}

function normalizeDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatUtcIcsDate(date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    'T',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    'Z',
  ].join('');
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(date).toUpperCase();
}

function formatDisplayTime(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timeZone || 'UTC',
    timeZoneName: 'short',
  }).format(date);
}

function formatWeekday(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: timeZone || 'UTC',
  }).format(date);
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>(?=.)/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeIcsText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function foldIcsLine(line) {
  const limit = 74;
  if (line.length <= limit) return line;
  const parts = [];
  let remaining = line;
  while (remaining.length > limit) {
    parts.push(remaining.slice(0, limit));
    remaining = ` ${remaining.slice(limit)}`;
  }
  parts.push(remaining);
  return parts.join('\r\n');
}

function buildIcsContent(event, { now = new Date() } = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Near Future Laboratory//Newsletter Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatUtcIcsDate(now)}`,
    `DTSTART:${formatUtcIcsDate(event.startsAtDate)}`,
    `DTEND:${formatUtcIcsDate(event.endsAtDate)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
  ];

  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

function getUrlValue(value) {
  if (typeof value === 'string') return value.trim();
  if (isPlainObject(value)) return firstString(value.href, value.url);
  return '';
}

function getLinkMetadata(value, fallbackHref, fallbackLabel) {
  if (isPlainObject(value)) {
    return {
      href: firstString(value.href, value.url, fallbackHref),
      label: firstString(value.label, fallbackLabel),
      category: firstString(value.category, 'events'),
      interest: value.interest,
      interests: value.interests,
      intent: firstString(value.intent, 'attend-event'),
    };
  }
  return {
    href: firstString(fallbackHref, getUrlValue(value)),
    label: fallbackLabel,
    category: 'events',
    intent: 'attend-event',
  };
}

function resolveCalendarOutput({ repoRoot, outputDir, finalOutputPath, calendarPublicRoot, issueYear, eventSlug }) {
  if (calendarPublicRoot) {
    return {
      filePath: `${calendarPublicRoot}${PathSep}calendar${PathSep}${issueYear}${PathSep}${eventSlug}.ics`,
      href: `https://nearfuturelaboratory.com/calendar/${issueYear}/${eventSlug}.ics`,
    };
  }
  const normalizedFinal = String(finalOutputPath || '');
  const publicMarker = `${PathSep}public${PathSep}`;
  const index = normalizedFinal.indexOf(publicMarker);
  if (index !== -1) {
    const publicRoot = normalizedFinal.slice(0, index + publicMarker.length - 1);
    return {
      filePath: `${publicRoot}${PathSep}calendar${PathSep}${issueYear}${PathSep}${eventSlug}.ics`,
      href: `https://nearfuturelaboratory.com/calendar/${issueYear}/${eventSlug}.ics`,
    };
  }

  return {
    filePath: `${outputDir}${PathSep}calendar${PathSep}${issueYear}${PathSep}${eventSlug}.ics`,
    href: `calendar/${issueYear}/${eventSlug}.ics`,
  };
}

const PathSep = '/';

export function normalizeCalendarEventSections(newsletterData, {
  repoRoot,
  outputDir,
  finalOutputPath,
  calendarPublicRoot,
  outputName,
  now,
  logger = console,
} = {}) {
  if (!newsletterData || !Array.isArray(newsletterData.sections)) {
    return { events: [], warnings: [] };
  }

  const issueId = firstString(newsletterData.issueId, outputName);
  const issueYear = inferYearFromIssueId(issueId) || new Date().getFullYear();
  const events = [];
  const warnings = [];

  newsletterData.sections.forEach((section, sectionIndex) => {
    if (!section || section.type !== 'calendar_event') return;

    const title = firstString(section.title, section.summary);
    const subtitle = firstString(section.subtitle);
    const summary = subtitle ? `${title}: ${subtitle}` : title;
    const startsAtDate = normalizeDate(section.startsAt || section.start || section.date);
    if (!title || !startsAtDate) {
      warnings.push(`calendar_event section ${sectionIndex + 1} requires title and startsAt`);
      return;
    }

    const durationMinutes = Number(section.durationMinutes || section.duration || 60);
    const endsAtDate = normalizeDate(section.endsAt || section.end) || new Date(startsAtDate.getTime() + Math.max(1, durationMinutes) * 60000);
    const eventSlug = slugify(firstString(section.id, section.slug, `${issueId}-${title}`));
    const urlSource = section.url || section.link || section.eventUrl;
    const url = getUrlValue(urlSource);
    const description = stripHtml(firstString(section.description, section.body));
    const location = firstString(section.location, section.locationName, url ? 'Online' : '');
    const calendarTarget = resolveCalendarOutput({ repoRoot, outputDir, finalOutputPath, calendarPublicRoot, issueYear, eventSlug });
    const calendarLabel = firstString(section.calendarLabel, section.calendarText, 'Add to calendar');
    const uid = `${eventSlug}-${formatUtcIcsDate(startsAtDate)}@nearfuturelaboratory.com`;

    section.id = eventSlug;
    section.eyebrow = firstString(section.eyebrow, section.kicker, 'Calendar Event');
    section.title = title;
    if (subtitle) section.subtitle = subtitle;
    section.description = description;
    section.location = location;
    section.calendarLabel = calendarLabel;
    section.displayDate = firstString(section.displayDate, formatDisplayDate(startsAtDate));
    section.displayTime = firstString(section.displayTime, formatDisplayTime(startsAtDate, section.timezone));
    section.displayWeekday = firstString(section.displayWeekday, formatWeekday(startsAtDate, section.timezone));
    section.calendarLink = getLinkMetadata(section.calendarLink, calendarTarget.href, `${issueId} | ${title} | calendar`);
    if (url) {
      section.eventLink = getLinkMetadata(urlSource, url, `${issueId} | ${title} | event page`);
      section.eventLabel = firstString(section.eventLabel, section.urlLabel, 'Event page');
      delete section.url;
    }

    events.push({
      sectionIndex,
      slug: eventSlug,
      filePath: calendarTarget.filePath,
      href: calendarTarget.href,
      content: buildIcsContent({
        uid,
        startsAtDate,
        endsAtDate,
        summary,
        description: description ? `${description}${url ? `\n\n${url}` : ''}` : url,
        location,
        url,
      }, { now }),
    });
  });

  if (warnings.length && logger?.warn) {
    warnings.forEach((warning) => logger.warn(`⚠️  ${warning}`));
  }

  return { events, warnings };
}

export function writeCalendarEventFiles(events, { fs, path, logger = console } = {}) {
  const written = [];
  for (const event of events || []) {
    if (!event?.filePath || !event?.content) continue;
    fs.mkdirSync(path.dirname(event.filePath), { recursive: true });
    fs.writeFileSync(event.filePath, event.content, 'utf8');
    written.push(event.filePath);
    if (logger?.log) logger.log(`📅 Calendar event: ${event.filePath}`);
  }
  return written;
}
