#!/usr/bin/env bash
# Runs the verify-biel Maestro flows against an installed release APK on a booted emulator.
# Usage: run-maestro-flows.sh <apk> <output-dir>
# Order matters: later flows depend on state from earlier ones (see .agents/skills/verify-biel/SKILL.md).
# Each flow starts from _home, whose _ready backs out of any screen the reading checkpoint restored.
# offline-read (real airplane mode) is left out; the in-app Force Offline flow covers offline reading.
set -uo pipefail

APK="$1"
OUT="$2"
APP_ID="org.bibletranslationtools.biel"
FLOWS_DIR=".agents/skills/verify-biel/flows"
FLOWS=(
  browse-languages
  browse-books
  read-chapter
  reader-checkpoint
  chapter-audio
  audio-panel-gestures
  download-book
  offline-read-forced
  downloads-library
)

mkdir -p "$OUT"
adb install -r "$APK"
adb shell pm grant "$APP_ID" android.permission.POST_NOTIFICATIONS || true
# A slow CI emulator often shows "Pixel Launcher isn't responding" over the app, which hides it from
# Maestro. Don't show ANR dialogs for background apps (the launcher is one while BIEL is open).
adb shell settings put secure anr_show_background 0 || true

# First launch boots past splash before any flow runs (_ready alone does not launch the app).
maestro test -e APP_ID="$APP_ID" "$FLOWS_DIR/_home.yaml" || true

failed=()
for flow in "${FLOWS[@]}"; do
  echo "::group::$flow"
  adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null || true
  if maestro test -e APP_ID="$APP_ID" \
    --format junit --output "$OUT/$flow.xml" \
    --test-output-dir "$OUT/$flow" \
    "$FLOWS_DIR/$flow.yaml"; then
    echo "PASS $flow"
  else
    echo "::error::Maestro flow failed: $flow"
    failed+=("$flow")
  fi
  echo "::endgroup::"
done

if ((${#failed[@]})); then
  echo "Failed flows: ${failed[*]}"
  exit 1
fi
echo "All ${#FLOWS[@]} flows passed"
