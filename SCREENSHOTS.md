# 📸 App Store Screenshot Guide — Bluom Build 18

> **Shadow Work Strategy**: Code on Windows, build via EAS Cloud, screenshot on MacBook Air.

---

## Step 1: Build for Simulator (Run on Windows)

```bash
# From your project root on Windows:
npx eas build --profile simulator --platform ios
```

This builds in the cloud and produces a `.tar.gz` file. Download it when the build finishes.

---

## Step 2: Set Up Mac (One-Time)

1. Open **Xcode 12** on your MacBook Air.
2. Go to **Xcode → Preferences → Components** and install these simulators:
   - **iPad Pro (12.9-inch) (4th generation)** — 2048×2732 screenshots
   - **iPad Pro (11-inch) (2nd generation)** — 1668×2388 screenshots
   - **iPhone 12 Pro Max** — 1284×2778 (6.7" class)
   - **iPhone 8 Plus** — 1242×2208 (5.5" class)

> ⚠️ Xcode 12 on Big Sur supports up to iOS 14 simulators. These devices cover all required App Store screenshot sizes.

---

## Step 3: Install App on Simulator

```bash
# 1. Extract the build
tar -xzf ~/Downloads/build-*.tar.gz -C ~/Desktop/

# 2. Boot a simulator
xcrun simctl boot "iPad Pro (12.9-inch) (4th generation)"

# 3. Open Simulator app
open -a Simulator

# 4. Install the app
xcrun simctl install booted ~/Desktop/Bluom.app
```

Repeat for each device size.

---

## Step 4: Take Screenshots

```bash
# Save screenshot of currently booted simulator
xcrun simctl io booted screenshot ~/Desktop/screenshots/ipad_13_home.png
```

### Required Screenshots (Apple App Store)

| Device | Simulator | Resolution | Screens to Capture |
|--------|-----------|------------|-------------------|
| iPad Pro 12.9" | iPad Pro (12.9") 4th gen | 2048×2732 | Home, Move, Fuel, Wellness, Profile |
| iPad Pro 11" | iPad Pro (11") 2nd gen | 1668×2388 | Home, Move, Fuel, Wellness, Profile |
| iPhone 6.7" | iPhone 12 Pro Max | 1284×2778 | Home, Move, Fuel, Wellness, Profile |
| iPhone 5.5" | iPhone 8 Plus | 1242×2208 | Home, Move, Fuel, Wellness, Profile |

### Required Screenshots (Google Play)

| Device | Size | Notes |
|--------|------|-------|
| Phone | Min 320px, max 3840px | Use iPhone screenshots |
| 7" Tablet | 1024×600 min | Optional |
| 10" Tablet | 1280×800 min | Use iPad screenshots |

---

## Step 5: Quick Script (Copy-Paste on Mac)

```bash
#!/bin/bash
# Create output folder
mkdir -p ~/Desktop/bluom_screenshots

# List of devices
DEVICES=(
  "iPad Pro (12.9-inch) (4th generation)"
  "iPad Pro (11-inch) (2nd generation)"
  "iPhone 12 Pro Max"
  "iPhone 8 Plus"
)

APP_PATH="$HOME/Desktop/Bluom.app"

for DEVICE in "${DEVICES[@]}"; do
  echo "📱 Processing: $DEVICE"
  
  # Boot
  xcrun simctl boot "$DEVICE" 2>/dev/null
  sleep 3
  
  # Install
  xcrun simctl install booted "$APP_PATH"
  
  # Launch
  xcrun simctl launch booted com.jwfca.bluom
  sleep 5
  
  # Screenshot
  SAFE_NAME=$(echo "$DEVICE" | tr ' ' '_' | tr -d '()')
  xcrun simctl io booted screenshot "$HOME/Desktop/bluom_screenshots/${SAFE_NAME}_home.png"
  
  echo "✅ Screenshot saved for $DEVICE"
  
  # Shutdown
  xcrun simctl shutdown booted
done

echo "🎉 All screenshots saved to ~/Desktop/bluom_screenshots/"
```

---

## iPad Status Bar Note

iPad simulators automatically render the **correct iPad status bar** (centered clock, battery on right, no notch). No special configuration needed — this is handled by iOS itself when `supportsTablet: true` is set in your Expo config.
