# 📋 PWA Splash Screen Testing Checklist

## Pre-Deployment Testing

### ✅ Configuration Check

- [ ] Verify `app/manifest.json` exists and is valid
- [ ] Verify `app/layout.tsx` has all meta tags
- [ ] Check splash screens exist in `public/splash-screens/`
- [ ] Run `npm run build` and confirm no errors

### ✅ Local Testing (if possible)

- [ ] Run `npm run dev`
- [ ] Navigate to http://localhost:3000
- [ ] Check DevTools > Application > Manifest (should load)
- [ ] Verify all images load without 404s

---

## Post-Deployment Testing (After Pushing to Vercel)

### 🍎 iOS Testing (iPhone)

**Device: iPhone 14/14 Pro/14 Pro Max, etc.**

#### Installation:

- [ ] Open Safari: https://bbms-offline-poc.vercel.app
- [ ] Tap Share button (↑) at bottom
- [ ] Select "Add to Home Screen"
- [ ] Review app name "BBMS" and icon
- [ ] Tap "Add" button

#### Launch & Splash Screen:

- [ ] Tap BBMS icon on home screen
- [ ] **EXPECTED**: Red splash screen appears (1-2 seconds)
- [ ] **EXPECTED**: Splash shows "BBMS" and "Blood Bank" text
- [ ] **EXPECTED**: Red circle icon visible in center
- [ ] **EXPECTED**: Splash fades when app loads
- [ ] App loads successfully

#### App Functionality:

- [ ] App displays correctly (full screen, no browser UI)
- [ ] All features work
- [ ] Can interact with app
- [ ] Status bar styling looks correct

### 🍎 iPad Testing

**Device: iPad (any model)**

#### Installation:

- [ ] Same steps as iPhone

#### Launch & Splash Screen:

- [ ] Tap BBMS icon on home screen
- [ ] **EXPECTED**: Larger splash screen (2048x2732)
- [ ] **EXPECTED**: Design scales properly
- [ ] App loads successfully

---

### 🤖 Android Testing (Chrome)

**Device: Android Phone with Chrome**

#### Installation:

- [ ] Open Chrome: https://bbms-offline-poc.vercel.app
- [ ] Tap Menu (⋮) at bottom right
- [ ] Select "Install app" (or "Add to Home screen")
- [ ] Review permissions
- [ ] Tap "Install" button

#### Launch & Splash Screen:

- [ ] Tap BBMS icon on home screen/app drawer
- [ ] **EXPECTED**: Red splash screen appears
- [ ] **EXPECTED**: Shows app name and icon
- [ ] App loads successfully

#### App Functionality:

- [ ] App displays correctly (full screen)
- [ ] All features work
- [ ] Can interact with app

---

### 🔍 Browser DevTools Check (Before Installing)

#### Chrome/Edge DevTools:

1. Open https://bbms-offline-poc.vercel.app
2. Right-click → **Inspect** (or F12)
3. Go to **Application** tab
4. Click **Manifest** on left sidebar
   - [ ] Manifest file loads without errors
   - [ ] Shows all required fields
   - [ ] Icons are listed
5. Go to **Service Workers** on left sidebar
   - [ ] Check if service worker is registered (optional but good)

#### Safari DevTools (Mac):

1. Open https://bbms-offline-poc.vercel.app in Safari
2. Develop menu → **Developer Settings** → Show console
3. Check console for any errors
4. Check all resources load (Network tab)

---

## ✅ Success Indicators

### iOS (Splash Screen Visible):

- ✅ Tap app icon and red splash appears immediately
- ✅ Splash contains app name "BBMS" and "Blood Bank" text
- ✅ Splash has red circle (icon)
- ✅ Splash fades smoothly when app loads
- ✅ App launches in full-screen mode (no Safari UI)

### Android (Splash Screen Visible):

- ✅ Tap app icon and splash appears
- ✅ Splash has your theme colors
- ✅ Splash fades smoothly when app loads
- ✅ App launches in full-screen mode

### General (All Platforms):

- ✅ No 404 errors for images/manifest
- ✅ App icon appears on home screen correctly
- ✅ App name displays correctly
- ✅ No console errors in DevTools
- ✅ All app features work normally

---

## ❌ If Something Isn't Working

### Splash Screen Not Showing on iOS?

```
1. Delete app from home screen (swipe and remove)
2. Clear Safari data: Settings → Safari → Clear History and Website Data
3. Reinstall the app from Safari
4. Try again
```

### Splash Screen Not Showing on Android?

```
1. Uninstall app
2. Clear Chrome cache: Chrome Menu → Settings → Privacy → Clear browsing data
3. Reinstall the app
4. Try again
```

### Manifest Not Loading?

```
1. Check browser console for errors (F12)
2. Verify https://bbms-offline-poc.vercel.app/manifest.json loads
3. Check app/manifest.json is valid JSON (use jsonlint.com)
4. Verify relative URLs (/web-app-manifest-192x192.png) are correct
```

### Images Not Loading?

```
1. Check public/splash-screens/ directory exists
2. Verify images: https://bbms-offline-poc.vercel.app/splash-screens/splash-1125x2436.png
3. Check file names match exactly in layout.tsx
4. Rebuild: npm run build
```

---

## 📊 Testing Matrix

| Device         | OS      | Browser | Expected Outcome     | Status |
| -------------- | ------- | ------- | -------------------- | ------ |
| iPhone 14 Pro  | iOS     | Safari  | Red splash screen    | ⬜     |
| iPhone 14      | iOS     | Safari  | Red splash screen    | ⬜     |
| iPhone SE      | iOS     | Safari  | Red splash screen    | ⬜     |
| iPad           | iOS     | Safari  | Larger splash screen | ⬜     |
| Android Phone  | Android | Chrome  | Red splash screen    | ⬜     |
| Android Tablet | Android | Chrome  | Larger splash screen | ⬜     |

_Fill in ⬜ with ✅ (pass) or ❌ (fail)_

---

## 📝 Notes Section

Use this space to document your test results:

```
Test Date: _______________
Tester: _______________
Device/OS: _______________
Browser: _______________

Results:
_________________________________
_________________________________
_________________________________
_________________________________

Issues Found:
_________________________________
_________________________________

Follow-up Actions:
_________________________________
_________________________________
```

---

## ✨ Final Sign-Off

- [ ] All critical tests passed
- [ ] App ready for production
- [ ] Users will see splash screens
- [ ] No console errors or 404s
- [ ] App performance is good

**Status**: Ready for Release ✅

---

**For more details**, see `SPLASH_SCREEN_COMPLETE.md` and `PWA_SPLASH_SCREEN_GUIDE.md`
