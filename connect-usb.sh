#!/usr/bin/env bash
set -e

echo "========================================================"
echo "🔌 Android USB Cable Reverse Bridge Setup"
echo "========================================================"

# Check if ADB is installed
if ! command -v adb &> /dev/null; then
    echo "❌ ADB not found. Please install android-tools-adb."
    exit 1
fi

echo "⏳ Checking for connected Android devices via ADB..."
DEVICE_COUNT=$(adb devices | grep -v "List" | grep "device$" | wc -l)

if [ "$DEVICE_COUNT" -eq 0 ]; then
    echo "⚠️  No authorized Android device detected yet!"
    echo ""
    echo "👉 Please verify these quick steps on your phone:"
    echo "   1. Connect phone to PC using a USB data cable."
    echo "   2. Enable USB Debugging:"
    echo "      • Phone Settings -> About Phone -> tap 'Build Number' 7 times."
    echo "      • Phone Settings -> Developer Options -> Enable 'USB Debugging'."
    echo "   3. On the phone popup: check 'Always allow from this computer' and tap 'Allow'."
    echo ""
    echo "🔄 Waiting for device authorization (plug in cable now)..."
    adb wait-for-device
    echo "✅ Device detected and authorized!"
fi

DEVICE_ID=$(adb devices | grep -v "List" | grep "device$" | awk '{print $1}' | head -n 1)
echo "📱 Connected Device: $DEVICE_ID"

echo "🔀 Configuring ADB Reverse Port Forwarding..."
adb reverse tcp:8081 tcp:8081
adb reverse tcp:4000 tcp:4000
adb reverse tcp:3000 tcp:3000

echo ""
echo "✅ USB TUNNEL ACTIVE:"
echo "   • Metro Bundler:   http://localhost:8081  (reverses to PC port 8081)"
echo "   • Backend API:     http://localhost:4000  (reverses to PC port 4000)"
echo "   • Realtime Socket: http://localhost:4000  (reverses to PC port 4000)"
echo ""
echo "🚀 Launching Expo Admin App over USB cable..."
adb shell am start -a android.intent.action.VIEW -d "exp://localhost:8081" 2>/dev/null || true

echo ""
echo "🎉 SUCCESS! Your phone is now paired directly over the USB cable."
echo "   You can open Expo Go and load: exp://localhost:8081"

