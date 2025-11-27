#!/bin/bash


# Quick workflow script to build email from Markdown using quick-build
# Usage: ./workflow.sh <content-file.md> [template-name] [output-file]



# Print help if no arguments or --help is given
if [ $# -eq 0 ] || [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    echo "Usage: ./workflow.sh <content-file.md> [template-name] [output-file]"
    echo "Example: ./workflow.sh ./test-dd.md dense-discovery"
    echo "Example: ./workflow.sh ./test-dd.md dense-discovery build_production/custom-output.html"
    echo "Example: ./workflow.sh /Users/julian/Code/nfl-backoffice/public/outbox/data/2025/w43-y25.md dense-discovery"
    exit 0
fi


CONTENT_FILE=$1
TEMPLATE=${2:-"dense-discovery"}
OUTPUT_FILE=$3
CONTENT_BASENAME=$(basename "$CONTENT_FILE")
OUTPUT_BASENAME="${CONTENT_BASENAME%.*}"
BUILD_OUTPUT_FILE="/Users/julian/Code/nfl-maizzle-mail/build_production/${OUTPUT_BASENAME}.html"
OUTPUT_DEST_PATH=""

if [ -n "$OUTPUT_FILE" ]; then
    if [[ "$OUTPUT_FILE" = /* ]]; then
        OUTPUT_DEST_PATH="$OUTPUT_FILE"
    else
        OUTPUT_DEST_PATH="$PWD/$OUTPUT_FILE"
    fi

    if [[ "$OUTPUT_FILE" == */ ]] || [[ "$OUTPUT_FILE" == *"/" ]]; then
        OUTPUT_DEST_PATH="${OUTPUT_DEST_PATH%/}/${OUTPUT_BASENAME}.html"
    elif [ -d "$OUTPUT_DEST_PATH" ]; then
        OUTPUT_DEST_PATH="${OUTPUT_DEST_PATH%/}/${OUTPUT_BASENAME}.html"
    fi
fi


normalize_img_tags() {
    local target_file="$1"

    if [ ! -f "$target_file" ]; then
        echo "⚠️  Image normalization skipped; file not found: $target_file"
        return
    fi

    python3 - "$target_file" <<'PY'
import sys
import re
from pathlib import Path

target = Path(sys.argv[1])
html = target.read_text(encoding='utf-8')
pattern = re.compile(r'<img\b[^>]*?>', re.IGNORECASE | re.DOTALL)
style_width_pattern = re.compile(r'(?<!max-)width\s*:', re.IGNORECASE)
style_max_width_pattern = re.compile(r'max-width\s*:', re.IGNORECASE)

def has_attr(tag, attr):
    return re.search(rf'\b{attr}\s*=', tag, re.IGNORECASE) is not None

def get_attr(tag, attr):
    match = re.search(rf'\b{attr}\s*=\s*([\'\"])(.*?)\1', tag, re.IGNORECASE | re.DOTALL)
    return match.group(2) if match else None

def replace_attr_value(tag, attr, new_value):
    pattern = re.compile(rf'({attr}\s*=\s*)([\'\"])(.*?)\2', re.IGNORECASE | re.DOTALL)
    def repl(match):
        return f"{match.group(1)}{match.group(2)}{new_value}{match.group(2)}"
    updated_tag, count = pattern.subn(repl, tag, count=1)
    return updated_tag if count else tag

def infer_numeric(value):
    if not value:
        return None
    match = re.search(r'([0-9]{2,4})', value)
    return match.group(1) if match else None

def infer_width_from_style(style_value):
    if not style_value:
        return None
    match = re.search(r'max-width\s*:\s*([0-9.]+)px', style_value, re.IGNORECASE)
    if match:
        return match.group(1)
    match = re.search(r'width\s*:\s*([0-9.]+)px', style_value, re.IGNORECASE)
    if match:
        return match.group(1)
    return None

def normalize_img(tag):
    width_attr = get_attr(tag, 'width')
    style_attr = get_attr(tag, 'style')

    missing_width = not has_attr(tag, 'width')
    missing_style = not has_attr(tag, 'style')

    style_updated = False

    width_hint = infer_width_from_style(style_attr)
    if width_hint is None:
        width_hint = infer_numeric(width_attr)
    if width_hint is None:
        width_hint = '600'

    insertion = ''
    if missing_width:
        insertion += f' width="{width_hint}"'
    if not missing_style and style_attr:
        style_value = style_attr.strip()
        if style_value and not style_value.endswith(';'):
            style_value += ';'
        additions = []
        if not style_width_pattern.search(style_attr):
            additions.append('width:100%')
        if not style_max_width_pattern.search(style_attr):
            additions.append(f'max-width:{width_hint}px')
        if additions:
            style_value += ''.join(f'{item};' for item in additions)
            tag = replace_attr_value(tag, 'style', style_value)
            style_updated = True
    if missing_style:
        style_value = f"-ms-interpolation-mode:bicubic;display:block;width:100%;max-width:{width_hint}px;height:auto;"
        insertion += f' style="{style_value}"'

    updated_tag = tag.replace('<img', '<img' + insertion, 1) if insertion else tag
    return updated_tag, bool(insertion) or style_updated

count = 0

def replace(match):
    global count
    new_tag, changed = normalize_img(match.group(0))
    if changed:
        count += 1
    return new_tag

updated_html = pattern.sub(replace, html)

if count:
    target.write_text(updated_html, encoding='utf-8')
    print(f"🖼  Normalized {count} <img> tag(s) in {target}")
else:
    print(f"🖼  No bare <img> tags detected in {target}")
PY
}


echo "🔄 Building email with quick-build..."
echo "📄 Content: $CONTENT_FILE"
echo "🎨 Template: $TEMPLATE"
TEMPLATE_STYLES_PATH="/Users/julian/Code/nfl-maizzle-mail/templates/$TEMPLATE/section-styles.json"
DEFAULT_STYLES_PATH="/Users/julian/Code/nfl-maizzle-mail/data/section-styles.json"
if [ -f "$TEMPLATE_STYLES_PATH" ]; then
    echo "🗂 Section styles will default to: $TEMPLATE_STYLES_PATH (content can override via sectionStylesFile)"
else
    echo "🗂 No template-specific section styles found; defaulting to: $DEFAULT_STYLES_PATH (content can override via sectionStylesFile)"
fi
if [ -n "$OUTPUT_FILE" ]; then
    echo "💾 Output: $OUTPUT_FILE"
    node /Users/julian/Code/nfl-maizzle-mail/scripts/quick-build.mjs "$TEMPLATE" "$CONTENT_FILE" "$OUTPUT_FILE"
else
    node /Users/julian/Code/nfl-maizzle-mail/scripts/quick-build.mjs "$TEMPLATE" "$CONTENT_FILE"
fi

BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -eq 0 ]; then
        normalize_targets=("$BUILD_OUTPUT_FILE")
        if [ -n "$OUTPUT_DEST_PATH" ] && [ "$OUTPUT_DEST_PATH" != "$BUILD_OUTPUT_FILE" ]; then
            normalize_targets+=("$OUTPUT_DEST_PATH")
        fi

        for normalize_target in "${normalize_targets[@]}"; do
            if [ -f "$normalize_target" ]; then
                echo "🛠  Harmonizing responsive <img> tags in $normalize_target"
                normalize_img_tags "$normalize_target"
            else
                echo "⚠️  Expected build output not found for image normalization: $normalize_target"
            fi
        done
        echo "✅ Email built successfully!"
        if [ -n "$OUTPUT_FILE" ]; then
            echo "📁 Output saved to $OUTPUT_FILE"
        else
            echo "📁 Check build_production/ for output"
        fi
else
        echo "❌ Email build failed"
        exit 1
fi