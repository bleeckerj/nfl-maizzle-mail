# Template Update Checklist

Use this when you change a newsletter HTML template so the data model, skeletons, and snippets stay in sync.

## 1) Update the template itself
- Edit the component/layout in `templates/<template-name>/`.
- Add/update any conditional blocks (ex: `intro.aside`) in the HTML.

## 2) Update the schema
- Add the new field(s) to the template schema:
  - `templates/<template-name>/newsletter.schema.json`

## 3) Update the skeleton generator
- If the field should appear in generated skeletons, update:
  - `scripts/generate-newsletter-skeleton.py`

## 4) Regenerate skeleton markdown
- Full skeleton:
  - `python scripts/generate-newsletter-skeleton.py --output templates/<template-name>/<template-name>-skeleton-full.md`
- Minimal skeleton:
  - `python scripts/generate-newsletter-skeleton.py --minimal --output templates/<template-name>/<template-name>-skeleton-minimal.md`

## 5) Update snippets (if used)
- Convert a skeleton to a VS Code snippet:
  - `python scripts/convert-skeleton-to-snippet.py templates/<template-name>/<template-name>-skeleton-full.md`
- This writes `templates/<template-name>/<template-name>-skeleton-full.snippet`.

## 6) Check sample data (optional)
- If there are sample data files or tests that reference the template, add the new field as needed.

## 7) Quick sanity check
- Rebuild a test newsletter and verify the new field renders as expected.
