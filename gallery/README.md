# Template gallery

A local browser collection of every directory under `templates/`, including
prototypes, legacy templates, and original-email references.

## Open the gallery

From the repository root:

```sh
npm run gallery:build
npm run gallery
```

Open **http://127.0.0.1:4319**. Subsequent visits only need `npm run gallery`;
cached previews survive between runs. Use `npm run gallery -- --port=4320` if
the default port is occupied. Opening `index.html` directly is not supported.

The gallery provides search, development-stage filtering, 800px desktop and
390px mobile email viewports, original-email comparison, and individual preview
links. Wide previews and comparisons scroll horizontally instead of shrinking
or cropping the email. Each email scrolls vertically inside its preview.

## Refresh samples

```sh
npm run gallery:build
npm run gallery:build -- --template=dense-discovery
```

Builds run sequentially through `scripts/build-newsletter.mjs` with `--preview`,
`--no-open`, and `--no-dark-mode-flatten`. Correspondence uses its dedicated
canonical builder. This is a light-mode review collection, not send-ready
certification. Schema, network, and rendering warnings remain visible.
Rendered samples are also checked for empty output, uncompiled template
elements, and visible `undefined` values. These are review warnings, not repairs
to the underlying templates.

The page polls for build progress without reloading unchanged preview frames.
A failed rebuild removes the prior success link. Failures do not stop the rest
of the collection. The command finishes successfully when it has recorded all
results, including individual failures; inspect the summary and gallery badges.
Local diagnostics are at `build_template_gallery/<name>/build.log`.

The builder uses a gallery lock plus the canonical newsletter build lock.
If an interrupted process leaves `build_template_gallery/.build-lock`, confirm
that the process has ended before removing that lock and rebuilding.

## Maintain the collection

- `config.json`, validated against `config.schema.json`, stores development
  descriptions and repository-relative sample/reference paths.
- New template directories appear automatically on the next build. Without
  configuration, sample discovery checks `sample-content.md`, `sample-data.json`,
  `content/<name>-source.md`, and `skeleton.md` in that order.
- Add a tracked sample when automatic discovery cannot find one. Templates
  without samples remain in the gallery with an explicit status.
- `samples/` holds gallery-owned fixtures. The New Yorker and Atlantic files
  preserve the previously generated source-rebuild Markdown. Dense Discovery
  adapts the existing test issue and omits obsolete local logo URLs so schema
  defaults apply. The mid-week fork uses that same gallery sample. The popup
  jobs fixture demonstrates one renderer, not all brand variants.
- Some original HTML files live in the existing ignored `emails-to-templatize/`
  folder. They appear when available locally; a fresh checkout may omit these
  optional comparisons. Tracked sample builds remain independently available.
- `manifest.schema.json` defines the generated status and provenance contract.
- HTML outputs, normalized build inputs, logs, and sidecars live in ignored
  `build_template_gallery/`; regenerate them rather than committing them.

No images are downloaded or copied into the repo. Existing hosted image URLs
remain in the email HTML, and may fail if their hosts are unavailable. HTML is
served unchanged in sandboxed preview frames; scripts, forms, and popups are
disabled. Original image geometry and legacy layout defects remain visible.
The server listens only on loopback and serves a fixed set of gallery assets
and HTML preview routes, not arbitrary repository files.

Browser previews do not replace testing in actual email clients. A source
reference is labeled separately from a successful template build.

## Verification

```sh
npm run test:gallery
```

Tests cover discovery, schema contracts, path boundaries, allowed routes, and
preservation of original preview HTML. Browser checks should cover selection,
search, filtering, desktop/mobile widths, comparison, and missing/failed builds.

## Editorial-owned job emails

Job-email copy lives in the sibling `nfl-editorial/emails/jobs/<slug>/email.md`. Set a gallery sample to `editorial:jobs/<slug>/email.md` to read it there. This prefix is restricted to that email corpus; traversal and symlink escapes are rejected. Gallery builds create disposable previews in Maizzle. Use editorial’s `npm run mail:build:job-email -- <slug>` to produce canonical HTML and manifests beside the Markdown.
