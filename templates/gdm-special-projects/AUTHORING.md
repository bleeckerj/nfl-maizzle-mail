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

The canonical HTML is `nfl-editorial/emails/jobs/gdm-expeditionary-engineering/gdm-expeditionary-engineering.html`, beside its Markdown. From nfl-maizzle-mail, run `npm run gallery:build -- --template=gdm-special-projects` to refresh the gallery cache. With the existing gallery running on port 4319, open `http://127.0.0.1:4319/previews/gdm-special-projects/preview.html`. The gallery reads this same editable draft. Build output is disposable; edit the source and rebuild. Nothing in these commands sends email.

Check desktop and mobile logo visibility, complete role text, company-specific hierarchy, public job destination, share composer content, and tracking conflicts. Browser verification does not establish inbox compatibility. The source lists both Venice Beach and Mountain View; this draft preserves both pending author clarification.

## Optional atmosphere banner

Add `image` inside `job` using only a hosted image URL and alt text:

```yaml
  image:
    src: https://imagedelivery.net/gaLGizR3kCgx5yRLtiRIOw/YOUR-IMAGE-ID/full
    alt: Describe the visible scene.
```

`width`, `height`, and `caption` are optional. The banner displays at full email width with automatic height, preserving the complete image. Omit `caption` for atmosphere imagery; the renderer omits the caption row and its spacing. A supplied caption appears below the image. The banner follows the role brief and precedes the recruiting letter. The required company-logo dimensions are unchanged.

## Sponsor ads and editing walkthrough

The complete [editorial authoring guide](../../../nfl-editorial/emails/README.md#gdm-atmosphere-banner) documents banner insertion, every GDM sponsor position, inline and multiple sponsors, and canonical versus gallery rebuilds. From this template directory, the sibling editorial guide is also available at `/Users/julian/Code/nfl-editorial/emails/README.md`.

Add an entry to the existing `sections` array:

```yaml
  - type: ad-block
    placement: after-introduction
    sponsorLabel: SPONSOR
    items:
      - adId: fluke-turing-clamp-4x5-01
```

Use one inventory ID per block and separate blocks for multiple ads. `after-introduction` follows the signed letter. `after-role` follows the optional banner. `inline` inserts an ad among recruiting lists in array order; all named placements use template boundaries. Omit a block to remove its ad. Inventory hydration supplies the copy, image, and destination at build time. An ad's image keeps its full natural composition, including portrait formats. Banner fields do not configure sponsor ads.

Rebuild the canonical email after edits, then rebuild the gallery sample and reload the preview. Neither operation sends mail. Changes to the shared inventory affect subsequent builds of every email using that ad ID.

Recruiting sponsor placements reuse `templates/dense-discovery/components/AdBlock.html`, the same component included by dense-discovery. Its existing card markup controls the border, image padding, copy, sponsor/CTA footer, and snapshot handling. The recruiting wrapper adds the SPONSOR heading and 40px desktop / 24px mobile side gutters. Do not create a separate recruiting ad-card structure. Banner images remain independent.

The editorial wrapper names HTML and manifests after the email-folder identifier supplied to the command. Add `--open` to open the resulting HTML through the operating system after a successful build; the default is build-only. `--dry-run --open` performs neither action. Generic `email.html` files from earlier builds are legacy output. Gallery previews keep their separate `preview.html` name.
