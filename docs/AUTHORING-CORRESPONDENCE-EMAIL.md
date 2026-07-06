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
signature:
  name: "Julian"
  lines:
    - "[Near Future Laboratory](https://nearfuturelaboratory.com)"
    - "[hello@nearfuturelaboratory.com](mailto:hello@nearfuturelaboratory.com)"
sharedItems:
  heading: "Shared items"
  items:
    - title: "Prototype Review Notes"
      href: "https://example.com/prototype-review"
      label: "Reference"
      image:
        src: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22520%22%20height%3D%22320%22%20viewBox%3D%220%200%20520%20320%22%3E%3Crect%20width%3D%22520%22%20height%3D%22320%22%20fill%3D%22%23f4f1ea%22%2F%3E%3Ctext%20x%3D%2232%22%20y%3D%22168%22%20font-family%3D%22monospace%22%20font-size%3D%2228%22%20fill%3D%22%23222222%22%3EPrototype%20Review%3C%2Ftext%3E%3C%2Fsvg%3E"
        alt: "Prototype review materials"
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

`sharedItems` is optional. When present, it must include either two or four valid items. Each item may include `image: { src, alt }`, `imageUrl`, or `imageSrc`; use hosted image URLs, `cid:` references, or small `data:image/...` placeholders, and keep image files out of the repository. Signature `lines` render Markdown links and appear after a visible pause below the signature name. Set `showSubject: true` only when the email body itself should include a heading. Set `showFromHeader: true` only when the HTML preview should show sender metadata above the message body.
