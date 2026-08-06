#!/bin/bash

# Quick workflow script to build email from Markdown using quick-build
# Usage: ./workflow.sh <content-file.md> [template-name] [output-file]

# Always run from the repo root so npm scripts resolve even when invoked from elsewhere
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"


print_usage() {
    cat <<'EOF'
Usage: ./workflow.sh [--content <path>] [--template <name>] [--output <path>] [--strict-schema] [--regen-schema] [--preview] [--send-test|send-test]
  or:   ./workflow.sh <content-file.md> [template] [output-file] [send-test]

Examples:
  ./workflow.sh content/2025-10-14.md dense-discovery
  ./workflow.sh content/2025-10-14.md dense-discovery build_production/custom-output.html
  ./workflow.sh content/2025-10-14.md dense-discovery --output public/outbox/issues/2025/w49-y25.html
  ./workflow.sh /Users/julian/Code/nfl-backoffice/public/outbox/data/2025/w49-y25.md dense-discovery --output /Users/julian/Code/nfl-backoffice/public/outbox/issues/2025/w49-y25.html send-test
  ./workflow.sh --regen-schema --strict-schema content/2025-10-14.md dense-discovery
EOF
}

# Resolve the absolute output path that quick-build will copy into,
# mirroring the logic inside scripts/quick-build.mjs for directories vs files.
resolve_output_dest_path() {
    local requested="$1"
    local base_name="$2"
    if [ -z "$requested" ]; then
        return
    fi
    local candidate
    if [[ "$requested" = /* ]]; then
        candidate="$requested"
    else
        candidate="$PWD/$requested"
    fi

    if [[ "$requested" == */ ]]; then
        candidate="${candidate%/}/${base_name}.html"
    elif [ -d "$candidate" ]; then
        candidate="${candidate%/}/${base_name}.html"
    fi

    printf '%s' "$candidate"
}

SEND_TEST_REQUESTED=false
STRICT_SCHEMA_REQUESTED=false
REGEN_SCHEMA_REQUESTED=false
PREVIEW_REQUESTED=false
POSITIONAL=()

while [ $# -gt 0 ]; do
    case "$1" in
        --help|-h)
            print_usage
            exit 0
            ;;
        --content|-c)
            if [ $# -lt 2 ]; then
                echo "❌ --content requires a file path"
                print_usage
                exit 1
            fi
            CONTENT_FILE="$2"
            shift 2
            ;;
        --template|-t)
            if [ $# -lt 2 ]; then
                echo "❌ --template requires a template name"
                print_usage
                exit 1
            fi
            TEMPLATE="$2"
            shift 2
            ;;
        --output|-o)
            if [ $# -lt 2 ]; then
                echo "❌ --output requires a destination path"
                print_usage
                exit 1
            fi
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --send-test|send-test)
            SEND_TEST_REQUESTED=true
            shift
            ;;
        --strict-schema)
            STRICT_SCHEMA_REQUESTED=true
            shift
            ;;
        --regen-schema)
            REGEN_SCHEMA_REQUESTED=true
            shift
            ;;
        --preview)
            PREVIEW_REQUESTED=true
            shift
            ;;
        --*)
            echo "❌ Unknown option: $1"
            print_usage
            exit 1
            ;;
        *)
            POSITIONAL+=("$1")
            shift
            ;;
    esac
done

if [ ${#POSITIONAL[@]} -gt 0 ] && [ -z "${CONTENT_FILE:-}" ]; then
    CONTENT_FILE="${POSITIONAL[0]}"
fi
if [ ${#POSITIONAL[@]} -gt 1 ] && [ -z "${TEMPLATE:-}" ]; then
    TEMPLATE="${POSITIONAL[1]}"
fi
if [ ${#POSITIONAL[@]} -gt 2 ] && [ -z "${OUTPUT_FILE:-}" ]; then
    OUTPUT_FILE="${POSITIONAL[2]}"
fi
if [ ${#POSITIONAL[@]} -gt 3 ]; then
    echo "❌ Unexpected extra arguments: ${POSITIONAL[@]:3}"
    print_usage
    exit 1
fi

if [ -z "${CONTENT_FILE:-}" ]; then
    echo "❌ Content file is required."
    print_usage
    exit 1
fi

TEMPLATE="${TEMPLATE:-dense-discovery}"

CONTENT_BASENAME=$(basename "$CONTENT_FILE")
OUTPUT_BASENAME="${CONTENT_BASENAME%.*}"
BUILD_OUTPUT_FILE="$SCRIPT_DIR/build_production/${OUTPUT_BASENAME}.html"
OUTPUT_DEST_PATH=""
QUICK_BUILD_OUTPUT_ARG=""
NODE_ENV_PREFIX=()

if [ "$STRICT_SCHEMA_REQUESTED" = true ]; then
    NODE_ENV_PREFIX+=(SCHEMA_STRICT=1)
fi

if [ -n "${OUTPUT_FILE:-}" ]; then
    OUTPUT_DEST_PATH=$(resolve_output_dest_path "$OUTPUT_FILE" "$OUTPUT_BASENAME")
    QUICK_BUILD_OUTPUT_ARG="$OUTPUT_DEST_PATH"
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

    # Skip tags that already carry explicit sizing info (width attribute or width/max-width in style)
    if width_attr:
        return tag, False
    if style_attr and (style_width_pattern.search(style_attr) or style_max_width_pattern.search(style_attr)):
        return tag, False

    missing_width = True
    missing_style = style_attr is None

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
if [ "$STRICT_SCHEMA_REQUESTED" = true ]; then
    echo "🧾 Schema validation: strict (SCHEMA_STRICT=1)"
else
    echo "🧾 Schema validation: warn (default)"
fi

if [ "$REGEN_SCHEMA_REQUESTED" = true ]; then
    SCHEMA_ENTRY="$SCRIPT_DIR/templates/$TEMPLATE/newsletter.html"
    SCHEMA_OUT="$SCRIPT_DIR/templates/$TEMPLATE/newsletter.schema.json"
    if [ -f "$SCHEMA_ENTRY" ]; then
        echo "🧬 Regenerating schema: $SCHEMA_OUT"
        if ! npm run -s schema:generate -- --entry "$SCHEMA_ENTRY" --output "$SCHEMA_OUT"; then
            echo "❌ Schema generation failed"
            exit 1
        fi
    else
        echo "⚠️  --regen-schema requested but entry template not found: $SCHEMA_ENTRY"
    fi
fi

TEMPLATE_STYLES_PATH="$SCRIPT_DIR/templates/$TEMPLATE/section-styles.json"
DEFAULT_STYLES_PATH="$SCRIPT_DIR/data/section-styles.json"
if [ -f "$TEMPLATE_STYLES_PATH" ]; then
    echo "🗂 Section styles will default to: $TEMPLATE_STYLES_PATH (content can override via sectionStylesFile)"
else
    echo "🗂 No template-specific section styles found; defaulting to: $DEFAULT_STYLES_PATH (content can override via sectionStylesFile)"
fi
if [ -n "$QUICK_BUILD_OUTPUT_ARG" ]; then
    echo "💾 Output: $QUICK_BUILD_OUTPUT_ARG"
    if [ "$PREVIEW_REQUESTED" = true ]; then
        "${NODE_ENV_PREFIX[@]}" node "$SCRIPT_DIR/scripts/quick-build.mjs" "$TEMPLATE" "$CONTENT_FILE" "$QUICK_BUILD_OUTPUT_ARG" --preview
    else
        "${NODE_ENV_PREFIX[@]}" node "$SCRIPT_DIR/scripts/quick-build.mjs" "$TEMPLATE" "$CONTENT_FILE" "$QUICK_BUILD_OUTPUT_ARG"
    fi
else
    if [ "$PREVIEW_REQUESTED" = true ]; then
        "${NODE_ENV_PREFIX[@]}" node "$SCRIPT_DIR/scripts/quick-build.mjs" "$TEMPLATE" "$CONTENT_FILE" --preview
    else
        "${NODE_ENV_PREFIX[@]}" node "$SCRIPT_DIR/scripts/quick-build.mjs" "$TEMPLATE" "$CONTENT_FILE"
    fi
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
        if [ -n "$OUTPUT_DEST_PATH" ]; then
            echo "📁 Output saved to $OUTPUT_DEST_PATH"
        else
            echo "📁 Check build_production/ for output"
        fi

                if [ "$SEND_TEST_REQUESTED" = true ]; then
                    SEND_TARGET="$BUILD_OUTPUT_FILE"
                    if [ -n "$OUTPUT_DEST_PATH" ]; then
                        SEND_TARGET="$OUTPUT_DEST_PATH"
                    fi

                    if [ -f "$SEND_TARGET" ]; then
                        echo "✉️  send-test requested; invoking npm run send:test -- $SEND_TARGET"
                        if ! npm run send:test -- "$SEND_TARGET"; then
                            echo "❌ send:test command failed"
                            exit 1
                        fi
                    else
                        echo "⚠️  send-test requested but HTML output not found: $SEND_TARGET"
                        exit 1
                    fi
                fi
else
        echo "❌ Email build failed"
        exit 1
fi
