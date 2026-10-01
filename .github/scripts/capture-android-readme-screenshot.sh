#!/usr/bin/env bash
set -euo pipefail

ROOT="${GITHUB_WORKSPACE:-$(cd "$(dirname "$0")/../.." && pwd)}"
APK="$ROOT/example-app/android/app/build/outputs/apk/debug/app-debug.apk"

adb wait-for-device
adb shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 2; done;'

echo "Waiting for Android package manager..."
for _ in $(seq 1 120); do
  if adb shell cmd package list packages 2>/dev/null | head -1 | grep -q package; then
    break
  fi
  sleep 3
done
sleep 30

for attempt in 1 2 3 4 5; do
  if adb install -r -g "$APK"; then
    break
  fi
  echo "adb install attempt $attempt failed, retrying..."
  sleep 20
  if [ "$attempt" = 5 ]; then
    exit 1
  fi
done

adb shell am start -n app.capgo.nativemap/.MainActivity
sleep 50
adb exec-out screencap -p > "$ROOT/readme-screenshot-android.png"
