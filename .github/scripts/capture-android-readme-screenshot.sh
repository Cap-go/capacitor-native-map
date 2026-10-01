#!/usr/bin/env bash
set -euo pipefail

ROOT="${GITHUB_WORKSPACE:-$(cd "$(dirname "$0")/../.." && pwd)}"
APK="$ROOT/example-app/android/app/build/outputs/apk/debug/app-debug.apk"

adb wait-for-device
adb shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 2; done;'
sleep 15
adb shell input keyevent 82 || true
sleep 5

for attempt in 1 2 3; do
  if adb install -r "$APK"; then
    break
  fi
  echo "adb install attempt $attempt failed, retrying..."
  sleep 10
  if [ "$attempt" = 3 ]; then
    exit 1
  fi
done

adb shell am start -n app.capgo.nativemap/.MainActivity
sleep 40
adb exec-out screencap -p > "$ROOT/readme-screenshot-android.png"
