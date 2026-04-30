#!/bin/bash

echo "🔍 PWA Splash Screen Configuration Verification"
echo "================================================\n"

# Check manifest.json
echo "✓ Checking manifest.json..."
if [ -f "app/manifest.json" ]; then
  echo "  ✅ manifest.json exists"
  if grep -q '"display": "standalone"' app/manifest.json; then
    echo "  ✅ Display mode: standalone"
  fi
  if grep -q '"background_color"' app/manifest.json; then
    echo "  ✅ Background color configured"
  fi
else
  echo "  ❌ manifest.json not found"
fi

# Check layout.tsx
echo "\n✓ Checking layout.tsx..."
if [ -f "app/layout.tsx" ]; then
  echo "  ✅ layout.tsx exists"
  if grep -q "apple-mobile-web-app-capable" app/layout.tsx; then
    echo "  ✅ Apple web app capable meta tag found"
  fi
  if grep -q "apple-touch-startup-image" app/layout.tsx; then
    echo "  ✅ Apple startup images configured"
  fi
else
  echo "  ❌ layout.tsx not found"
fi

# Check splash screens
echo "\n✓ Checking splash screen images..."
SPLASH_COUNT=$(find public/splash-screens -name "*.png" 2>/dev/null | wc -l)
if [ "$SPLASH_COUNT" -gt 0 ]; then
  echo "  ✅ Found $SPLASH_COUNT splash screen images"
  echo "\n  Generated splash screens:"
  ls -lh public/splash-screens/*.png 2>/dev/null | awk '{print "    - " $9 " (" $5 ")"}'
else
  echo "  ❌ No splash screen images found"
  echo "  Run: npm run generate-splash"
fi

# Check icons
echo "\n✓ Checking app icons..."
if [ -f "public/web-app-manifest-192x192.png" ]; then
  echo "  ✅ 192x192 icon found"
fi
if [ -f "public/web-app-manifest-512x512.png" ]; then
  echo "  ✅ 512x512 icon found"
fi

echo "\n================================================"
echo "✅ Configuration verification complete!"
echo "\nNext steps:"
echo "1. Deploy to Vercel: git push"
echo "2. Test on iOS: Open in Safari > Share > Add to Home Screen"
echo "3. Test on Android: Open in Chrome > Menu > Install app"
