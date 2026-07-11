# generate-newsletter-skeleton.py

Create a ready-to-edit markdown front matter skeleton for the `dense-discovery` template. The script inspects the known section types and emits a complete YAML block with sample content so you can start filling in a new issue quickly.

## Prerequisites
- Python 3.9+ (tested with 3.x)
- PyYAML (`pip install pyyaml`)
- Run from the repo root: `python scripts/generate-newsletter-skeleton.py ...`

## Usage
```bash
python scripts/generate-newsletter-skeleton.py [--minimal] [--output FILE] [--sections TYPE ...] [--list-sections]
```

### Options
- `--minimal`  
  Output one sample item per section and skip most optional fields. Good for a lighter starter file.
- `--output`, `-o FILE`  
  Destination filename. Defaults to `newsletter-skeleton.md` in the current directory. Accepts relative or absolute paths.
- `--sections TYPE [TYPE ...]`  
  Limit output to types supported by this legacy generator: `ad-block`, `feature`, `dispatch`, `apps-sites`, `apps-sites-single-column`, `callout`, `quote`, `indie-mag`, `single-column`, `books-accessories`, `food-for-thought`, `aesthetically-pleasing`, `classifieds`, `animated-image`, and `image`.
- `--list-sections`  
  Print all available section types with their required/optional fields and exit.

## What gets generated
- A markdown file containing only YAML front matter (`--- ... ---`).
- Top-level fields include `template`, `title`, `preheader`, `sectionStylesFile`, `intro`, `header`, `sections`, and `footer`.
- Each section includes the correct `type`, section-level fields, and sample items with required and optional fields populated (unless `--minimal` is used).
- For `dispatch` sections, `signalsLabel` and `tags` are item-level fields (`sections[].items[]`) used to render the SIGNALS tag bar.
- For `food-for-thought` sections, the legacy `readMoreText` + `readMoreLink` pair remains the primary CTA row, and optional `readMoreLinks` entries add extra CTA rows as `{ text, link }`.
- Sample image URLs use placeholders; replace them with real assets before building.
- The checked-in `templates/dense-discovery/dense-discovery-skeleton-full.md` also includes the registry-backed `short-take` type. The Python generator does not emit it yet; copy that block or author it manually with one `shortTakeId`.

## Examples

Generate the full skeleton with all section types (default):
```bash
python scripts/generate-newsletter-skeleton.py
```

Minimal skeleton (fewer sample items/fields) to `drafts/w50.md`:
```bash
python scripts/generate-newsletter-skeleton.py --minimal --output drafts/w50.md
```

Only “food-for-thought” and “feature” sections:
```bash
python scripts/generate-newsletter-skeleton.py --sections food-for-thought feature --output focused.md
```

See available section types and fields:
```bash
python scripts/generate-newsletter-skeleton.py --list-sections
```

## Tips
- The output is already in the shape expected by `./workflow.sh` / `quick-build`. Drop in real copy and URLs, then run your normal build.
- Keep `sectionStylesFile` if you want template defaults; override it to point at a custom styles file if needed.
- Optional boolean flags like `paywall` default to `true` in the sample; set them explicitly to `false` or remove them if not needed.
