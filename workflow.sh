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


if [ $? -eq 0 ]; then
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