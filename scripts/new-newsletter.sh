#!/bin/bash
#
# Quick wrapper script for generating newsletter skeletons
# 
# Usage:
#   ./scripts/new-newsletter.sh                    # Generate with current date
#   ./scripts/new-newsletter.sh my-newsletter      # Custom filename
#   ./scripts/new-newsletter.sh --minimal          # Minimal version
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONTENT_DIR="$PROJECT_ROOT/content"

# Parse arguments
MINIMAL=""
FILENAME=""

for arg in "$@"; do
    case $arg in
        --minimal|-m)
            MINIMAL="--minimal"
            shift
            ;;
        *)
            FILENAME="$arg"
            shift
            ;;
    esac
done

# Generate default filename if not provided
if [ -z "$FILENAME" ]; then
    DATE=$(date +%Y-%m-%d)
    FILENAME="newsletter-${DATE}.md"
fi

# Add .md extension if not present
if [[ ! "$FILENAME" =~ \.md$ ]]; then
    FILENAME="${FILENAME}.md"
fi

OUTPUT_PATH="$CONTENT_DIR/$FILENAME"

# Check if file already exists
if [ -f "$OUTPUT_PATH" ]; then
    echo "⚠️  File already exists: $OUTPUT_PATH"
    read -p "Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 1
    fi
fi

# Generate the skeleton
echo "📝 Generating newsletter skeleton..."
python "$SCRIPT_DIR/generate-newsletter-skeleton.py" $MINIMAL --output "$OUTPUT_PATH"

echo ""
echo "✨ Newsletter created: $OUTPUT_PATH"
echo ""
echo "Next steps:"
echo "  1. Edit the file: code $OUTPUT_PATH"
echo "  2. Build the newsletter: npm run build"
echo ""
