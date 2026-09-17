# Maintaining Adjacency job-email production

This guide covers the Maizzle implementation of company-specific recruiting emails whose content belongs to `nfl-editorial`. For copy editing and routine operation, use the [editorial author guide](../../nfl-editorial/emails/README.md). Read [the template operating process](newsletter-template-operating-process.md) before changing a template.

## Responsibility boundary

| Concern | Owner |
| --- | --- |
| Original web job | Editorial `src/content/jobs/` |
| Adapted email copy | Editorial `emails/jobs/<job-id>/<job-id>.email.md` |
| Canonical HTML and manifests | Beside that Markdown in editorial; generated and Git-ignored |
| Employer-specific presentation | Maizzle `templates/<template>/` |
| Schema and source validation | Maizzle template schema and canonical build pipeline |
| Ads inventory | Editorial `src/content/ads.json` |
| Share-link preparation | Maizzle `lib/newsletter-core/prepare-adjacency-recruiting.mjs` |
| Gallery selection | Maizzle `gallery/config.json` |
| Gallery preview HTML and diagnostics | Maizzle `build_template_gallery/`; disposable cache |
| Recipients, sender headers, scheduling, dispatch | The separately invoked delivery system |

Do not move authored job-email drafts back into Maizzle `content/` or template sample files. Existing newsletter and correspondence workflows retain their own source contracts; this guide changes ownership for Adjacency job-email adaptations.

## Current templates and sources

| Template | Editorial source | Presentation |
| --- | --- | --- |
| `gdm-special-projects` | `emails/jobs/gdm-expeditionary-engineering/gdm-expeditionary-engineering.email.md` | Hosted DeepMind logo, white background, light sans-serif hierarchy, role brief before letter, neutral appointment summary, understated referral link. |
| `adjacency-recruiting` | `emails/jobs/platform-counter-inference-analyst/platform-counter-inference-analyst.email.md` | FDAA recruiting treatment with hosted agency branding and inline field imagery. Its field contract is reusable; the visual treatment is not a universal employer template. |

Read each template's [GDM authoring guide](../templates/gdm-special-projects/AUTHORING.md) or [FDAA/reference guide](../templates/adjacency-recruiting/AUTHORING.md). The earlier FDAA draft lacks the company mark required for new employer emails. Schema acceptance alone does not establish editorial readiness.

## Source-to-output flow

```text
Editorial email.md
  -> editorial scripts/mail/build-job-email.mjs
  -> Maizzle scripts/build-newsletter.mjs (cwd = Maizzle)
  -> normalization, schema validation, hydration, shared preparation
  -> templates/<selected-template>/newsletter.html
  -> <slug>.html + manifests in the editorial source directory
```

The editorial wrapper resolves `emails/config.json` relative to the editorial root. Its `maizzleRepo` defaults to `../nfl-maizzle-mail`. It checks that the source and builder exist, invokes the canonical builder through the current Node executable, and propagates failure status. It does not parse or rewrite the copy itself.

The canonical pipeline uses `data/newsletter.json` and `build_production/` internally. Treat both as build machinery. Build-only injected fields must not be persisted into authored Markdown. Production scratch files can be replaced or removed by later builds, including gallery builds. The final adjacent editorial output is the handoff artifact.

Run builds sequentially. The builder has a shared build lock, and gallery generation has its own lock. Do not launch rendering tests against shared build state concurrently with a canonical or gallery build; a previous concurrent run demonstrated cross-run data interference.

## Canonical build entry points

### Preferred author command

From `nfl-editorial`:

```sh
npm run mail:build:job-email -- gdm-expeditionary-engineering
```

The slug selects `emails/jobs/<job-id>/<job-id>.email.md`. Output name is always `email`. The wrapper supports `--dry-run` for path inspection; that mode does not validate or render.

### Direct Maizzle invocation

From this repository, the equivalent explicit build is:

```sh
node scripts/build-newsletter.mjs \
  /Users/julian/Code/nfl-editorial/emails/jobs/gdm-expeditionary-engineering/gdm-expeditionary-engineering.email.md \
  email \
  --output-dir=/Users/julian/Code/nfl-editorial/emails/jobs/gdm-expeditionary-engineering \
  --no-open \
  --strict-schema
```

Use the canonical builder for final verification. Raw `maizzle build` bypasses parts of preparation, schema checks, hydration, and manifest generation.

### MCP

Discover the Maizzle tools and read the selected template's authoring guide and schema. Validate the Markdown, then call `build_campaign_email` with explicit arguments:

```json
{
  "content_md_path": "/Users/julian/Code/nfl-editorial/emails/jobs/gdm-expeditionary-engineering/gdm-expeditionary-engineering.email.md",
  "template": "gdm-special-projects",
  "campaign_name": "email",
  "output_dir": "/Users/julian/Code/nfl-editorial/emails/jobs/gdm-expeditionary-engineering"
}
```

`template` asserts the source's selection. Do not rely on this tool's default output directory; it is not the adjacent-source convention. Inspect success, returned artifact paths, and `sourceUnchanged`. Campaign inputs use `build_campaign_email`, not the regular-issue `build_newsletter` tool.

## Output contract

A successful build writes:

- `<slug>.html`: rendered handoff email.
- `<slug>.link-tracking-manifest.json`: final link metadata and conflict diagnostics.
- `<slug>.content-slots.json`: rendered content-slot metadata.
- A mobile-typography sidecar when the applicable verification path produces it.

Keep these generated files outside Git using editorial's existing ignore rules. Keep source Markdown, renderer configuration, template files, and tests tracked. Rebuild after a fresh checkout. A failed build is not guaranteed to remove an older adjacent output; report the failure rather than presenting the old file as current.

## Gallery configuration and path boundaries

The gallery reads external editorial content through an explicit prefix:

```json
{
  "stage": "prototype",
  "description": "Google DeepMind Special Projects recruiting email.",
  "sample": "editorial:jobs/gdm-expeditionary-engineering/gdm-expeditionary-engineering.email.md"
}
```

Place this entry under `templates.gdm-special-projects` in `gallery/config.json`. `gallery/config.schema.json` documents the configuration contract.

`lib/template-gallery/catalog.mjs` resolves `editorial:` relative to the sibling `nfl-editorial/emails` directory. It rejects lexical traversal and symlink escapes outside that source root. Ordinary sample paths remain restricted to this repository.

This sibling lookup is independent of editorial's `maizzleRepo` setting. A non-sibling workspace needs an intentional gallery configuration/resolver change with tests; changing only the author build setting is insufficient.

From Maizzle:

```sh
npm run gallery:build -- --template=gdm-special-projects
npm run gallery -- --port=4319
```

The preview is `http://127.0.0.1:4319/previews/gdm-special-projects/preview.html`. One configured source represents a template in the gallery. Building a second job with that template does not automatically switch the gallery sample.

Gallery rendering writes normalized preview input and diagnostics beneath `build_template_gallery/<template>/`. It uses `--preview`, `--no-open`, and `--no-dark-mode-flatten`; it does not overwrite the canonical editorial output. The server exposes fixed gallery routes and sandboxed HTML, not arbitrary source files. Browser-side scripts and forms are disabled.

A gallery command can exit successfully after recording failed entries. Inspect the selected template's status and `build.log`, not only the process exit code. Existing unrelated warnings or failures elsewhere in the gallery are separate from the requested template's result. See [the gallery guide](../gallery/README.md).

## Company-specific template development

Every new employer treatment must integrate the company's actual hosted logo and align with its style, voice, and character. Different employers need different compositions and typographic hierarchies. Recoloring FDAA or GDM and swapping the name is insufficient. The same employer may reuse its own design across roles.

1. Inspect the editorial job renderer, hosted logo, and company hiring/brand references.
2. Choose a structure suited to that employer: opening hierarchy, letter placement, role summary, qualifications, and closing treatment.
3. Create `templates/<employer-template>/` with `newsletter.html`, `layouts/`, focused `components/`, `newsletter.schema.json`, `section-styles.json`, `template.manifest.json`, and `AUTHORING.md`.
4. Define required logo fields and all author-controlled behavior in the schema before implementing the renderer. Avoid accepting fields that the template silently discards.
5. Preserve the shared content concepts where useful, while giving the layout its own structure. Shared components are appropriate for genuinely common behavior, including sponsor hydration.
6. If the template uses the recruiting share contract, register its ID in `isRecruitingEmailTemplate` in `lib/newsletter-core/prepare-adjacency-recruiting.mjs`.
7. Confirm `normalize.mjs` uses that shared predicate to remove generated `share.emailHref` on authoring export. Do not duplicate mailto encoding or invent a second preparation path.
8. Create the actual draft in editorial, configure its gallery source, and add focused schema/render tests.
9. Build through the canonical entry point and inspect desktop and mobile output.

Keep templates canonical under `templates/`; do not create `src/templates` mirrors. Preserve UI, preparation, data access, and configuration boundaries. Update the schema alongside any changed author-controlled field or behavior.

### Logos, imagery, and typography

A company logo is required even when the email omits a role illustration. Use the source job's `companyLogo` or a verified asset in Photarium. Preserve aspect ratio, clear space, and the entire mark. Do not recolor or redraw a logo to fit a generic theme.

Email clients vary in SVG and font support. GDM uses the hosted PNG rendition of the source logo's linked raster and has Arial/Helvetica fallbacks for Google Sans. Verify image loading in the browser; schema acceptance does not prove delivery or correct dimensions. Inspect both narrow and wide layouts for overflow and clipped marks. A web-font preview is not proof that a mail client will load the font.

The GDM palette follows its source company renderer: white, charcoal, neutral gray, and restrained Google accents. Large saturated blue panels are excluded from that treatment. Other employers need their own design choices.

## Shared source semantics

### Recruiting copy and explainer

Preserve source job facts and employment conditions. Keep employer-facing copy in its established world. `operatorContext` is the authorized editorial explainer and is visually separated from recruiting. Current templates place it after recruiting; YAML property order does not change layout.

### GDM banners

`job.image` is an optional atmosphere banner in `gdm-special-projects`. Its schema requires only `src` (hosted Photarium URL) and `alt`. Dimensions and caption are optional; do not request them merely to satisfy the build. `components/Brief.html` renders the image at full email width with automatic height and renders a caption row only when caption text is present. No caption means no caption row or caption spacing. Company-logo requirements remain separate.

The banner follows the opening role brief and precedes the letter; `after-role` sponsors follow the banner. Changing YAML property order does not reposition the banner. See the [GDM authoring guide](../templates/gdm-special-projects/AUTHORING.md) and [editorial operator guide](../../nfl-editorial/emails/README.md#gdm-atmosphere-banner) for examples and the placement table. Other employer schemas retain their own contracts.

### Ads

`ad-block` sections contain one inventory `adId` each. Shared hydration reads editorial's `src/content/ads.json`. Keep inventory copy, full image geometry, and destinations intact.

Supported placement names are `top`, `after-introduction`, `after-role`, `after-assignment`, `inline`, `after-lists`, `after-compensation`, `after-recruiting`, `after-explainer`, and `after-share`. Document each employer template's interpretation. `inline` follows array order among recruiting lists; named placements are component boundaries. Omission defaults to `after-recruiting` for compatibility. New drafts should specify placement deliberately.

### Sharing and links

Preparation creates a `mailto:` URI from `share.subject`, `share.message`, and `job.link`, with the public job URL separated by a blank line. `share.enabled: false` suppresses sharing. `share.emailHref` is build-owned and pruned before authoring validation/export. Preserve punctuation through encoding and never include subscriber tokens.

Job link objects require `href`, `label`, and `category: jobs`. Reader-facing destinations remain on The Adjacency; company-domain provenance does not authorize a company application link. Publication identity links to the Adjacency subscribe page. Review final manifests for conflicts and decoded share content.

### Delivery

`recruiter.name` and `signature` are visible copy, not transport headers. `title` is not an instruction to set a delivery subject. `[unsubscribe]` is a sender-resolved placeholder. No build operation supplies dispatch approval. Do not send mail as an incidental validation step.

## Verification

Run these focused checks with the sibling editorial checkout available, then run the final canonical build:

```sh
node --test \
  tests/newsletter-core/gdm-special-projects.test.mjs \
  tests/newsletter-core/adjacency-recruiting.test.mjs \
  tests/newsletter-core/adjacency-recruiting-placement.test.mjs \
  tests/newsletter-core/template-schema-contract.test.mjs \
  tests/template-gallery/gallery.test.mjs
```

These tests cover logo schema requirements, shared sharing behavior, source immutability, sponsor placement, schema-derived starters, and gallery path/server boundaries. 

For final review, confirm:

- Source and output paths are editorial-owned; authored copy has not been rewritten by the build.
- Template ID, required company logo, employment facts, and employer-specific presentation are correct.
- The full logo and any content images remain visible on desktop and mobile.
- The explainer is separate, sponsor placements are deliberate, and share content contains the public job URL.
- Link and content-slot manifests exist, and link conflicts are understood or resolved.
- Canonical build success is distinguished from a gallery preview and from inbox-client verification.

## Troubleshooting and maintenance

| Symptom | Responsible area |
| --- | --- |
| Missing editorial draft | Gallery sample reference, sibling layout, or editorial slug. |
| New template has no share URL | Register its ID in the shared recruiting predicate; verify preparation runs. |
| Generated share field rejected on export | Confirm pruning uses the shared predicate. |
| Schema-valid source renders missing content | Trace the selected component; schema acceptance is only one check. |
| Stale canonical HTML | Rerun the editorial build and inspect status; gallery builds update only cache. |
| Production scratch output disappears | Expected build-directory reuse; use adjacent editorial output. |
| Rendering test unexpectedly sees another sample | Stop concurrent builds and rerun sequentially. |
| Broken logo | Verify hosted rendition, source dimensions, network response, and final image element. |
| Gallery has a success exit with failures | Inspect per-template records and build logs. |
| Locked gallery | Confirm no live build owns the lock before removing a stale lock. |
| Preview and final colors differ | Compare preview flags and canonical dark-mode policy before editing colors. |

Keep [the installed skill source](../skills/adjacency-job-email/SKILL.md), template guides, gallery configuration, and this guide aligned with code changes. The installed skill at `~/.codex/skills/adjacency-job-email` links to the maintained repository skill. Commit only task changes; generated artifacts and unrelated author edits require separate handling. Rendering and documentation changes do not imply publication or dispatch.

Recruiting sponsor placements reuse `templates/dense-discovery/components/AdBlock.html`, the same component included by dense-discovery. Its existing card markup controls the border, image padding, copy, sponsor/CTA footer, and snapshot handling. The recruiting wrapper adds an optional explicitly authored `label` heading and 40px desktop / 24px mobile side gutters. Do not create a separate recruiting ad-card structure. Banner images remain independent.

The editorial wrapper names HTML and manifests after the email-folder identifier supplied to the command. Successful builds open the resulting HTML through the operating system by default; use `--no-open` to suppress the preview. `--open` remains a compatibility alias. Build-only `--dry-run` prints the plan without building or opening. Generic `email.html` files from earlier builds are legacy output. Gallery previews keep their separate `preview.html` name.

The editorial job-email command accepts `send-test` or `--send-test` to reuse the same Maizzle SES helper as nfl-backoffice newsletter tests. Sending follows a successful build and uses the configured Maizzle `.env` sender and test recipients. `send-test --dry-run` builds and validates without opening or sending. The subject uses source `subject`, then `title`, then the job ID. See the editorial email guide for command examples and configuration ownership. Do not invoke a live test merely to validate implementation.
