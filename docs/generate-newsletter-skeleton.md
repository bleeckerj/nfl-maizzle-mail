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
  Limit output to specific section types. Valid types match the newsletter template: `sponsor`, `dispatch`, `apps-sites`, `apps-sites-single-column`, `quote`, `indie-mag`, `indie-mag-single-column`, `books-accessories`, `food-for-thought`, `aesthetically-pleasing`, `classifieds`, `animated-image`.
- `--list-sections`  
  Print all available section types with their required/optional fields and exit.

## What gets generated
- A markdown file containing only YAML front matter (`--- ... ---`).
- Top-level fields include `template`, `title`, `preheader`, `sectionStylesFile`, `intro`, `header`, `sections`, and `footer`.
- Each section includes the correct `type`, section-level fields, and sample items with required and optional fields populated (unless `--minimal` is used).
- Sample image URLs use placeholders; replace them with real assets before building.

## Examples

Generate the full skeleton with all section types (default):
```bash
python scripts/generate-newsletter-skeleton.py
```

Minimal skeleton (fewer sample items/fields) to `drafts/w50.md`:
```bash
python scripts/generate-newsletter-skeleton.py --minimal --output drafts/w50.md
```

Only “food-for-thought” and “sponsor” sections:
```bash
python scripts/generate-newsletter-skeleton.py --sections food-for-thought sponsor --output focused.md
```

See available section types and fields:
```bash
python scripts/generate-newsletter-skeleton.py --list-sections
```

## Tips
- The output is already in the shape expected by `./workflow.sh` / `quick-build`. Drop in real copy and URLs, then run your normal build.
- Keep `sectionStylesFile` if you want template defaults; override it to point at a custom styles file if needed.
- Optional boolean flags like `paywall` default to `true` in the sample; set them explicitly to `false` or remove them if not needed.
