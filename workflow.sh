#!/bin/bash

# Quick workflow script to build email from Markdown using quick-build
# Usage: ./workflow.sh <content-file.md> [template-name]

if [ $# -eq 0 ]; then
    echo "Usage: ./workflow.sh <content-file.md> [template-name]"
    echo "Example: ./workflow.sh ./test-dd.md dense-discovery"
    echo "Example: ./workflow.sh /Users/julian/Code/nfl-backoffice/public/outbox/data/2025/w43-y25.md dense-discovery"
    exit 1
fi

CONTENT_FILE=$1
TEMPLATE=${2:-"dense-discovery"}

echo "🔄 Building email with quick-build..."
echo "📄 Content: $CONTENT_FILE"
echo "🎨 Template: $TEMPLATE"

node /Users/julian/Code/nfl-maizzle-mail/scripts/quick-build.mjs "$TEMPLATE" "$CONTENT_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Email built successfully!"
    echo "📁 Check build_production/ for output"
else
    echo "❌ Email build failed"
    exit 1
fi