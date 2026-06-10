// Emit a Maizzle template + Markdown skeleton from the classifier output.
//
// Outputs (under templates/<name>/ and content/):
//   templates/<name>/components/<TypePascal>.html  -- one per discovered component type
//   templates/<name>/layouts/main.html             -- minimal email-safe layout
//   templates/<name>/newsletter.html               -- extends layout, loops `sections`
//   templates/<name>/section-styles.json           -- design tokens per component type
//   templates/<name>/newsletter.schema.json        -- JSON Schema for the data shape
//   content/<name>-source.md                       -- skeleton reconstructing the source
//   generated/<name>-decompilation-report.json     -- run report with confidences

import fs from 'fs';
import path from 'path';
import { config } from './config.mjs';

const SLOT_KIND_RICH = new Set(['rich_text']);

export function emit({ repoRoot, templateName, sourcePath, segmentation, classifier, darkModeFlatten = true }) {
  const { sections } = segmentation;
  const { components, sectionAssignments } = classifier.result;

  const templateDir = path.join(repoRoot, config.templatesDir, templateName);
  const componentsDir = path.join(templateDir, 'components');
  const layoutsDir = path.join(templateDir, 'layouts');
  const contentDir = path.join(repoRoot, config.contentDir);
  const reportDir = path.join(repoRoot, config.reportDir);

  for (const d of [templateDir, componentsDir, layoutsDir, contentDir, reportDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  const componentFiles = {};
  for (const comp of components) {
    const fileName = pascalCase(comp.type) + '.html';
    const filePath = path.join(componentsDir, fileName);
    fs.writeFileSync(filePath, wrapComponent(comp));
    componentFiles[comp.type] = fileName;
  }
  // Inline-dispatch path also needs mob-text on each branch's outermost
  // element. The inline branches are emitted in newsletterHtml() — there's
  // nothing to do here; that function calls addMobTextClass when wrapping.

  const layoutPath = path.join(layoutsDir, 'main.html');
  fs.writeFileSync(layoutPath, layoutHtml(templateName, { darkModeFlatten }));

  const newsletterPath = path.join(templateDir, 'newsletter.html');
  fs.writeFileSync(newsletterPath, newsletterHtml(templateName, components, componentFiles, { darkModeFlatten }));

  const sectionStyles = buildSectionStyles(components, sectionAssignments, sections, { darkModeFlatten });
  fs.writeFileSync(
    path.join(templateDir, 'section-styles.json'),
    JSON.stringify(sectionStyles, null, 2) + '\n'
  );

  const schema = buildSchema(templateName, components);
  fs.writeFileSync(
    path.join(templateDir, 'newsletter.schema.json'),
    JSON.stringify(schema, null, 2) + '\n'
  );

  const skeletonPath = path.join(contentDir, `${templateName}-source.md`);
  fs.writeFileSync(skeletonPath, skeletonMarkdown(templateName, components, sectionAssignments));

  const reportPath = path.join(reportDir, `${templateName}-decompilation-report.json`);
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        source: sourcePath,
        templateName,
        model: classifier.model,
        usage: classifier.usage,
        layoutRoot: segmentation.root.tagName.toLowerCase(),
        sectionCount: sections.length,
        components: components.map((c) => ({
          type: c.type,
          displayName: c.displayName,
          sectionIndexes: c.sectionIndexes,
          slots: c.slots.map((s) => s.name),
          confidence: c.confidence,
          notes: c.notes,
        })),
        sectionAssignments: sectionAssignments.map((a) => ({
          index: a.index,
          type: a.type,
          confidence: a.confidence,
          notes: a.notes,
        })),
      },
      null,
      2
    ) + '\n'
  );

  return {
    templateDir,
    componentsDir,
    layoutPath,
    newsletterPath,
    skeletonPath,
    reportPath,
    sectionStylesPath: path.join(templateDir, 'section-styles.json'),
    schemaPath: path.join(templateDir, 'newsletter.schema.json'),
  };
}

function wrapComponent(comp) {
  // The components/ files are reference artifacts (a human-readable palette).
  // Render-time dispatch happens inline in newsletter.html, because Maizzle's
  // <component> props require a per-component <script props> extractor — too
  // much boilerplate to auto-generate. The body here uses {{ section.X }}
  // because that is how it would be invoked from inside the dispatch loop.
  const body = rewriteSlots(comp.template, comp.slots);
  const slotList = comp.slots
    .map((s) => `  - ${s.name} (${s.kind}) — ${s.description}`)
    .join('\n');
  return `<!--
  ${comp.displayName}
  ${comp.description}

  Slots:
${slotList}

  Used by section indexes: [${comp.sectionIndexes.join(', ')}] in the source email.
  Reference only — render-time dispatch is in templates/<name>/newsletter.html.
-->
${body}
`;
}

function indent(text, n) {
  const pad = ' '.repeat(n);
  return text
    .split('\n')
    .map((l) => (l.length ? pad + l : l))
    .join('\n');
}

function addMobTextClass(html, { darkModeFlatten = true } = {}) {
  // Append "mob-text" to the class attribute of the first opening tag (or
  // add a class attribute if none exists). The layout's @media rule uses
  // descendant selectors (.mob-text p, .mob-text a, etc.) so marking the
  // outermost element cascades to all text-bearing children. This is the
  // same idiom dense-discovery's components use.
  const tagMatch = html.match(/^(\s*)(<\w+\b)([^>]*)(\/?>)/);
  if (!tagMatch) return html;
  const [, lead, openTag, attrs, close] = tagMatch;
  let newAttrs;
  const darkModeClasses = darkModeFlatten
    ? "{{ darkModePolicy && darkModePolicy.flatten ? ' dm-surface dm-text' : '' }}"
    : '';
  if (/\bclass\s*=\s*"([^"]*)"/.test(attrs)) {
    newAttrs = attrs.replace(/\bclass\s*=\s*"([^"]*)"/, (_, val) => {
      const classes = val.trim().split(/\s+/).filter(Boolean);
      if (!classes.includes('mob-text')) classes.push('mob-text');
      return `class="${classes.join(' ')}${darkModeClasses}"`;
    });
  } else {
    newAttrs = attrs + ` class="mob-text${darkModeClasses}"`;
  }
  return lead + openTag + newAttrs + close + html.slice(tagMatch[0].length);
}

function rewriteSlots(html, slots) {
  // Components are invoked from inline dispatch in newsletter.html, so a slot
  // `title` inside the template body has to resolve to `section.title`.
  //
  // For rich_text slots we ALWAYS emit triple-mustache `{{{ }}}` even if the
  // classifier wrote double-mustache `{{ }}` — escaped HTML would render
  // visible <em>...</em> tags as text (a real bug we've seen). Other slot
  // kinds use double-mustache and let Maizzle escape (safe default).
  let out = html;
  for (const slot of slots) {
    const name = slot.name;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const replacement = SLOT_KIND_RICH.has(slot.kind)
      ? `{{{ section.${name} }}}`
      : `{{ section.${name} }}`;
    // Match triple-mustache first so the double-mustache regex doesn't
    // mangle the inner `{` characters.
    out = out.replace(
      new RegExp(`\\{\\{\\{\\s*${escaped}\\s*\\}\\}\\}`, 'g'),
      SLOT_KIND_RICH.has(slot.kind) ? replacement : `{{{ section.${name} }}}`
    );
    out = out.replace(
      new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, 'g'),
      replacement
    );
  }
  // posthtml-safe-class-names crashes on empty class="" attributes — strip them.
  out = out.replace(/\s+class\s*=\s*"\s*"/g, '');
  return out;
}

function darkModeFlattenHeadHtml() {
  return `  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
`;
}

function darkModeFlattenCssHtml() {
  return `    @media (prefers-color-scheme: dark) {
      body.dm-bg,
      .dm-bg {
        background-color: #111318 !important;
      }

      .dm-bg table,
      .dm-bg td,
      .dm-surface {
        background-color: #1b1f27 !important;
      }

      .dm-text,
      .dm-bg,
      .dm-bg p,
      .dm-bg div,
      .dm-bg span,
      .dm-bg h1,
      .dm-bg h2,
      .dm-bg h3,
      .dm-bg h4,
      .dm-bg h5,
      .dm-bg h6 {
        color: #f2f4f8 !important;
      }

      .dm-muted,
      .dm-bg .mob-meta,
      .dm-bg .image-caption,
      .dm-bg .image-credit {
        color: #b8c0cc !important;
      }

      .dm-link,
      .dm-bg a,
      .dm-bg .theme-link {
        color: #8ecbff !important;
      }

      .dm-border,
      .dm-bg table,
      .dm-bg td {
        border-color: #343b48 !important;
      }
    }
`;
}

function layoutHtml(templateName, { darkModeFlatten = true } = {}) {
  const darkModeHead = darkModeFlatten
    ? `  <if condition="darkModePolicy && darkModePolicy.flatten">\n${darkModeFlattenHeadHtml()}  </if>\n`
    : '';
  const darkModeCss = darkModeFlatten
    ? `\n    /* Defensive dark-mode flatten: enabled by build-newsletter.mjs unless --no-dark-mode-flatten is set. */\n${darkModeFlattenCssHtml()}`
    : '';
  const darkModeBodyClass = darkModeFlatten
    ? ` class="{{ darkModePolicy && darkModePolicy.flatten ? 'dm-bg dm-text' : '' }}"`
    : '';
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
${darkModeHead}  <title>{{ page.title || title || '${templateName}' }}</title>
  <style>
    /* Mobile font-size lock — bumps body copy larger on small screens so
       readers don't have to zoom. Same pattern as dense-discovery. Don't
       lower these without updating tests/newsletter-core/mobile-font-size-lock.test.mjs. */
    @media screen and (max-width: 599px) {
      .mob-text,
      .mob-text a,
      .mob-text p,
      .mob-text li,
      .mob-text span,
      .mob-text td,
      .mob-text div {
        font-size: 23px !important;
        line-height: 1.3 !important;
      }
      .mob-title,
      .mob-title a {
        font-size: 26px !important;
        line-height: 1.3 !important;
      }
      .mob-subtitle,
      .mob-subtitle a {
        font-size: 21px !important;
        line-height: 1.3 !important;
      }
      .mob-caption,
      .mob-caption a,
      .mob-caption p,
      .mob-caption span {
        font-size: 14px !important;
        line-height: 1.2 !important;
      }
      table.full-width,
      .full-width,
      table[role="presentation"],
      table[width],
      td[width] {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
      }
      img {
        max-width: 100% !important;
        height: auto !important;
        width: auto !important;
      }
    }${darkModeCss}
  </style>
</head>
<body${darkModeBodyClass} style="margin: 0; padding: 0; width: 100%; background-color: #ffffff;">
  <block name="template"></block>
</body>
</html>
`;
}

function newsletterHtml(templateName, components, _componentFiles, { darkModeFlatten = true } = {}) {
  // Inline dispatch: <each> over sections, with one <if> branch per
  // discovered component type. Each branch contains the component's body
  // (slots rewritten to {{ section.X }}, mob-text class added to outermost
  // element). This is the pattern dense-discovery uses and that we know
  // works under Maizzle's posthtml stack.
  //
  // Render order is determined by the user's `sections:` frontmatter, so
  // duplicating, reordering, or removing sections in markdown produces
  // different layouts — which is the whole point.
  const branches = components
    .map((c) => {
      const body = addMobTextClass(rewriteSlots(c.template, c.slots), { darkModeFlatten });
      return `    <if condition="section.type === '${c.type}'">
${indent(body, 6)}
    </if>`;
    })
    .join('\n');

  return `---
title: "{{ page.title }}"
---

<extends src="templates/${templateName}/layouts/main.html">
  <block name="template">

  <each loop="section in sections">
${branches}
  </each>

  </block>
</extends>
`;
}

function buildSectionStyles(components, sectionAssignments, segments, { darkModeFlatten = true } = {}) {
  // For each discovered type, pick the styles from the first section assigned
  // to it. Good enough as a starting palette — the user can edit afterwards.
  const indexBySectionIndex = new Map(segments.map((s) => [s.index, s]));
  const sectionStyles = {};
  for (const comp of components) {
    const firstIdx = comp.sectionIndexes[0];
    const seg = indexBySectionIndex.get(firstIdx);
    sectionStyles[comp.type] = {
      name: comp.displayName,
      description: comp.description,
      containerStyles: seg?.styles?.containerStyles || {},
      contentStyles: seg?.styles?.contentStyles || {},
      linkStyles: seg?.styles?.linkStyles || {},
      headingStyles: seg?.styles?.headingStyles || {},
    };
  }
  const globalOverrides = {
    description:
      'Mobile font-size lock — bumps body copy larger on small screens for readability. Same pattern as dense-discovery.',
    mobileBreakpoint: '599px',
    mobileAdjustments: {
      contentStyles: {
        fontSize: '23px',
        lineHeight: '1.3',
      },
      captionStyles: {
        fontSize: '14px',
        lineHeight: '1.2',
      },
    },
  };

  if (darkModeFlatten) {
    globalOverrides.darkModeFlatten = {
      enabledByDefault: true,
      disableFlag: '--no-dark-mode-flatten',
      mode: 'flatten',
      description:
        'Defensive dark-mode fallback. Build-time policy flattens colored sections to dark gray surfaces with off-white text when the recipient client honors prefers-color-scheme: dark.',
      colors: {
        pageBackground: '#111318',
        surface: '#1b1f27',
        text: '#f2f4f8',
        mutedText: '#b8c0cc',
        link: '#8ecbff',
        border: '#343b48',
      },
    };
  }

  return {
    description: `Decompiled section styles for template "${segments.length} sections" (auto-generated).`,
    version: '1.0.0',
    sectionStyles,
    // Mobile font-size lock — same shape build-newsletter.mjs reads from
    // dense-discovery. Exposes mobileTextFontSize / mobileCaptionFontSize to
    // the pipeline; the layout's @media rule applies them via .mob-text /
    // .mob-caption classes injected by the emitter.
    globalOverrides,
  };
}

function buildSchema(templateName, components) {
  const oneOf = components.map((c) => ({
    type: 'object',
    title: c.displayName,
    description: c.description,
    properties: {
      type: { const: c.type },
      ...Object.fromEntries(
        c.slots.map((s) => [s.name, slotSchema(s)])
      ),
    },
    required: ['type'],
    additionalProperties: true,
  }));

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: `${templateName} newsletter schema`,
    description: `Schema for newsletters built on the "${templateName}" decompiled component palette.`,
    type: 'object',
    properties: {
      template: { type: 'string', const: templateName },
      title: { type: 'string' },
      sections: {
        type: 'array',
        items: { oneOf },
      },
    },
    required: ['template', 'sections'],
  };
}

function slotSchema(slot) {
  switch (slot.kind) {
    case 'image_url':
    case 'link_url':
      // Don't require strict URI format — real-world emails use "#",
      // "mailto:", empty strings, and tracking-pixel redirects that don't
      // parse as canonical URIs. Just require a string.
      return { type: 'string', description: slot.description };
    case 'image_alt':
    case 'date':
    case 'label':
    case 'text':
      return { type: 'string', description: slot.description };
    case 'rich_text':
      return { type: 'string', description: slot.description + ' (HTML allowed)' };
    case 'link_label':
      return { type: 'string', description: slot.description };
    default:
      return { type: 'string', description: slot.description || '' };
  }
}

function skeletonMarkdown(templateName, components, sectionAssignments) {
  const componentByType = new Map(components.map((c) => [c.type, c]));
  const lines = [
    '---',
    `template: ${templateName}`,
    `title: "${templateName} (decompiled from source)"`,
    `sectionStylesFile: templates/${templateName}/section-styles.json`,
    'sections:',
  ];
  for (const a of sectionAssignments) {
    const comp = componentByType.get(a.type);
    lines.push(`  - type: ${a.type}`);
    if (comp) {
      for (const slot of comp.slots) {
        const v = (a.itemValues || {})[slot.name];
        lines.push(`    ${slot.name}: ${yamlScalar(v)}`);
      }
    }
  }
  lines.push('---', '', `<!-- ${templateName}: this skeleton reconstructs the source email using its discovered component palette. Edit, duplicate, or remove sections to author a new email. -->`, '');
  return lines.join('\n');
}

function yamlScalar(v) {
  if (v == null) return '""';
  const s = String(v);
  // Always quote — values may contain HTML, colons, hashes, leading/trailing
  // whitespace, etc. Use single quotes with the standard YAML escape (double
  // single-quote for an embedded single quote).
  return `'${s.replace(/'/g, "''")}'`;
}

function pascalCase(snake) {
  return snake
    .split(/[_\-]/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join('');
}
