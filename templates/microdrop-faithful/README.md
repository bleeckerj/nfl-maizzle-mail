# Faithful Microdrop Email

`microdrop-faithful` is the email-side rendering contract for a microdrop that should preserve the authored page as an in-world artifact.

The agent writes the Markdown source. The template owns table-safe HTML, typography, spacing, image presentation, and responsive behavior.

Supported section types:

- `infra-product`
- `infra-image-heading`
- `infra-copy`
- `infra-subscribe`
- `infra-exposure`
- `infra-definition`
- `infra-pairing`
- `infra-compatibility`
- `infra-legal`
- `infra-about`
- `culture-hero`
- `culture-menu`
- `culture-methods`
- `culture-copy`
- `culture-feature`
- `culture-gallery`
- `culture-shop`
- `culture-find`

The authoring Markdown should contain source-backed text, hosted image URLs, and ordered `sections`. Do not author HTML, CSS, JavaScript, editorial notes, grounding, or provenance in the email source.

For `culture-menu`, product descriptions use the plain-text `copy` field so the canonical mail pipeline does not interpret them as rich text.

Build with:

```bash
npm run build:newsletter content/<issue>.md <output-name> --no-open
```
