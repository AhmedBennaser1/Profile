#!/bin/bash
# publish.sh — Build the site from markdown files and push to GitHub.
# Usage: ./publish.sh "optional commit message"

set -e
cd "$(dirname "$0")"

# Build data.js from markdown files
node build.js

# Stage, commit, push
MSG="${1:-Update content}"
git add -A
git commit -m "$MSG" || echo "Nothing to commit."
git push -u origin main

echo "✓ Published!"
