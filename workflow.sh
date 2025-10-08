#!/bin/bash

# Quick workflow script to convert Markdown and build email
# Usage: ./workflow.sh content/2025-10-07.md [template-name]

if [ $# -eq 0 ]; then
    echo "Usage: ./workflow.sh <content-file.md> [template-name]"
    echo "Example: ./workflow.sh content/2025-10-07.md"
    echo "Example: ./workflow.sh content/my-newsletter.md newsletter"
    exit 1
fi

CONTENT_FILE=$1
TEMPLATE=${2:-"wirecutter"}

echo "🔄 Converting Markdown to JSON (template: $TEMPLATE)..."
node scripts/md_to_json.mjs "$CONTENT_FILE" data/newsletter.json --template="$TEMPLATE"

if [ $? -eq 0 ]; then
    echo "📧 Building email HTML..."
    npx maizzle build production
    
    if [ $? -eq 0 ]; then
        echo "✅ Email built successfully!"
        echo "🎨 Template: $TEMPLATE"
        echo "📁 Output: build_production/newsletter.html"
        
        # Optional: Open the file in default browser (macOS)
        # open build_production/newsletter.html
    else
        echo "❌ Email build failed"
        exit 1
    fi
else
    echo "❌ Markdown conversion failed"
    exit 1
fi