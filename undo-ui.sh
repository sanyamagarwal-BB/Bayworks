#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# BAYWORKS — UI undo
# Restores index.html, src/main.js, src/style.css from the most
# recent backup and removes the 3D city scene (src/city.js).
# Usage:  bash undo-ui.sh            (restore latest backup)
#         bash undo-ui.sh <stamp>    (restore a specific backup)
# List backups:  ls .ui-backup
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

STAMP="${1:-$(cat .ui-backup/LATEST 2>/dev/null || true)}"

if [ -z "${STAMP}" ] || [ ! -d ".ui-backup/${STAMP}" ]; then
  echo "✗ No backup found. Available backups:"
  ls .ui-backup 2>/dev/null | grep -v LATEST || echo "  (none)"
  exit 1
fi

echo "↩  Restoring UI from backup ${STAMP} ..."
cp ".ui-backup/${STAMP}/index.html"  index.html
cp ".ui-backup/${STAMP}/main.js"     src/main.js
cp ".ui-backup/${STAMP}/style.css"   src/style.css
[ -f ".ui-backup/${STAMP}/cms.js" ]     && cp ".ui-backup/${STAMP}/cms.js"     src/cms.js
[ -f ".ui-backup/${STAMP}/admin.html" ] && cp ".ui-backup/${STAMP}/admin.html" admin.html

# Remove the 3D scene module added by the UI upgrade
if [ -f src/city.js ]; then
  rm -f src/city.js
  echo "   removed src/city.js"
fi

echo "✓ UI restored to pre-upgrade state."
echo "  (Backups kept in .ui-backup/ — delete that folder when you're happy.)"
