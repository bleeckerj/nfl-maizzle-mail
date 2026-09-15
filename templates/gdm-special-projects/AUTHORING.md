# Google DeepMind Special Projects email

This employer-specific template uses a white logo masthead, light sans-serif role heading, introductory letter, gray appointment summary, plain sections, and an understated referral link. Google colors appear in a thin accent rule. Large colored panels and the FDAA layout are excluded from this treatment.

## Editable source

Edit `/Users/julian/Code/nfl-editorial/emails/jobs/gdm-expeditionary-engineering/email.md`. Keep `template: gdm-special-projects` and `publicationMode: campaign`. All copy remains in YAML frontmatter. The source job is `nfl-editorial/src/content/jobs/google-deepmind/research-engineer-special-projects-expeditionary-engineering.mdx`.

`companyLogo` is required: `src`, `alt`, original `width`, and original `height`. Use the complete hosted mark. The GDM source SVG is Photarium `fe30ce2f-0964-4781-b037-42e404cffa00`; its linked raster is `1c9b8ab8-1efb-4c0b-9b91-8c92e122ea00`, 512 × 119. The email requests the raster’s PNG rendition. The wordmark displays at 280px desktop and 240px mobile, preserving its natural ratio and clear space. This is intentional logo sizing, separate from content-image presentation.

Typography and neutral colors follow `nfl-editorial/src/styles/jobs.googledeepmindish.css`. The source Google Sans font has Arial/Helvetica fallbacks for email clients. The hiring institution leads the masthead and signature; The Adjacency appears in the editorial note and subscription footer. Preserve the gently unusual cover letter without changing source job facts.

Use the shared [field and editing guide](../adjacency-recruiting/AUTHORING.md) for job fields, explainer, share text, and ads. This template has its own schema. Sponsors use the same placement names; here `after-role` follows the opening role brief, `after-introduction` follows the signed letter, and `after-assignment` follows the appointment summary. Inline ads follow list order. Sponsors are optional; company branding is required.

## Build and preview

Build from `/Users/julian/Code/nfl-editorial`:

```sh
npm run mail:build:job-email -- gdm-expeditionary-engineering
```

The canonical HTML is `nfl-editorial/emails/jobs/gdm-expeditionary-engineering/email.html`, beside its Markdown. From nfl-maizzle-mail, run `npm run gallery:build -- --template=gdm-special-projects` to refresh the gallery cache. With the existing gallery running on port 4319, open `http://127.0.0.1:4319/previews/gdm-special-projects/preview.html`. The gallery reads this same editable draft. Build output is disposable; edit the source and rebuild. Nothing in these commands sends email.

Check desktop and mobile logo visibility, complete role text, company-specific hierarchy, public job destination, share composer content, and tracking conflicts. Browser verification does not establish inbox compatibility. The source lists both Venice Beach and Mountain View; this draft preserves both pending author clarification.

## Optional atmosphere banner

Add `image` inside `job` using only a hosted image URL and alt text:

```yaml
  image:
    src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/YOUR-IMAGE-ID/full
    alt: Describe the visible scene.
```

`width`, `height`, and `caption` are optional. The banner displays at full email width with automatic height, preserving the complete image. Omit `caption` for atmosphere imagery; the renderer omits the caption row and its spacing. A supplied caption appears below the image. The banner follows the role brief and precedes the recruiting letter. The required company-logo dimensions are unchanged.
