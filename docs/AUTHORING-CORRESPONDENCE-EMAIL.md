# Authoring Correspondence Email

Use this workflow when the output is a standard HTML email message, separate from mass newsletter production. It uses the Maizzle rendering stack and a Near Future Laboratory correspondence template without newsletter-specific build behavior.

## Source Location

Keep private working drafts in the ignored local directory:

```text
correspondence/
```

Tracked examples live under:

```text
examples/correspondence/
```

## Build Command

```bash
npm run build:correspondence -- correspondence/client-note.md client-note
```

The generated HTML is local only:

```text
build_correspondence/client-note.html
```

The correspondence builder does not create a newsletter archive page, view-online URL, unsubscribe link, link-tracking manifest, or content-slot manifest.

## Markdown Shape

```markdown
---
subject: "Follow-up on the workshop brief"
preheader: "A short note with the revised framing."
eyebrow: "Near Future Laboratory"
brand:
  name: "Near Future Laboratory"
  url: "https://nearfuturelaboratory.com"
signature:
  name: "Julian"
  lines:
    - "Near Future Laboratory"
sharedItems:
  heading: "Shared items"
  items:
    - title: "Prototype Review Notes"
      href: "https://example.com/prototype-review"
      label: "Reference"
      description: "A short description of why this is useful."
    - title: "Session Outline"
      href: "https://example.com/session-outline"
      label: "Brief"
      description: "A second item to share below the signature."
footerNote: "Reply directly to this email with questions."
---

Hi Alex,

Here is the revised note.
```

`sharedItems` is optional. When present, it must include either two or four valid items. Set `showSubject: true` only when the email body itself should include a heading. Set `showFromHeader: true` only when the HTML preview should show sender metadata above the message body.
