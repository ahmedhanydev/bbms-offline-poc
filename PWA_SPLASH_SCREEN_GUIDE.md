# PWA Splash Screen Configuration Guide

## ✅ What's Been Fixed

Your BBMS app now has complete PWA splash screen support for iOS and Android devices!

### iOS Splash Screens

- ✓ iPhone 14 Pro Max (1242x2688)
- ✓ iPhone 14 Pro (1170x2532)
- ✓ iPhone 14/13 Pro Max (1125x2436)
- ✓ iPhone SE (750x1334)
- ✓ iPad Pro (2048x2732)

### Android Splash Screens

- ✓ Uses `theme_color` and `background_color` from manifest.json
- ✓ Displays app name and icon during loading

## 🔧 How to Use

### 1. **Installation on iPhone**

```
1. Open your app in Safari: https://bbms-offline-poc.vercel.app
2. Tap the "Share" button (arrow pointing up)
3. Select "Add to Home Screen"
4. Tap "Add" to confirm
5. When launching, you'll see the BBMS splash screen with your custom design
```

### 2. **Installation on Android**

```
1. Open your app in Chrome: https://bbms-offline-poc.vercel.app
2. Tap the menu (three dots)
3. Select "Install app" or "Add to Home screen"
4. Tap "Install" to confirm
5. When launching, you'll see your custom splash screen
```

## 📁 Files Modified/Created

### Created Files:

- `generate-splash-screens.js` - Script to generate splash screens
- `public/splash-screens/` - Directory containing all splash screen images

### Modified Files:

- `app/layout.tsx` - Added all PWA meta tags and apple-touch-startup-image links
- `app/manifest.json` - Enhanced PWA manifest configuration
- `package.json` - Added `generate-splash` script

## 🎨 Splash Screen Design

The splash screens are generated with:

- **Background**: #e40000 (Dark Red)
- **Accent Circle**: #ff0000 (Red)
- **Text**: "BBMS" + "Blood Bank"
- **Font**: Arial (system default)

### Customize Splash Screens

If you want to customize the splash screen design (colors, text, etc.):

```bash
npm run generate-splash
```

Edit `generate-splash-screens.js` to change:

- Colors
- Text content
- Logo design
- Font sizes

Then regenerate:

```bash
npm run generate-splash
```

## 🔄 What Happens When You Launch the App

### On iOS:

1. User taps the BBMS icon on home screen
2. iOS displays the custom splash screen (1-2 seconds)
3. Your app loads and the splash screen fades away

### On Android:

1. User taps the BBMS icon on home screen
2. Chrome displays splash screen with:
   - App name: "BBMS by Ahmed Hany"
   - Background color: #e40000
   - Theme color: #ff0000
3. Your app loads and the splash screen fades away

## 📋 Key Configuration Details

### `app/layout.tsx` Meta Tags:

- `apple-mobile-web-app-capable: yes` - Enables full-screen mode on iOS
- `apple-mobile-web-app-status-bar-style: black-translucent` - Custom status bar styling
- `viewport-fit=cover` - Supports notch/Dynamic Island on newer iPhones

### `app/manifest.json` Properties:

- `display: standalone` - App runs in standalone mode (no browser UI)
- `background_color: #e40000` - Loading screen background
- `theme_color: #ff0000` - Browser/Android theme color
- `orientation: portrait-primary` - Forces portrait orientation

## 🚀 Deployment

Everything is ready to deploy! Your splash screens are:

- ✓ Automatically included in the build
- ✓ Served from `/public/splash-screens/`
- ✓ Cached by the browser for offline access

### Deploy to Vercel:

```bash
git add .
git commit -m "Add PWA splash screen support"
git push
```

The app will automatically be updated on Vercel.

## ⚠️ Important Notes

1. **Clear Cache**: Users may need to reinstall the app for splash screens to update
2. **iOS**: Splash screens only work when the app is installed to the home screen
3. **Android**: Splash screens work in PWA mode (installed from browser)
4. **Testing**: Test on real devices, not browsers, for accurate splash screen display

## 🔗 Useful Resources

- [Web App Manifest Spec](https://www.w3.org/TR/appmanifest/)
- [iOS Web Apps](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [Android PWA Splash Screens](https://web.dev/articles/add-install-prompt)

## 📞 Troubleshooting

### Splash screen not appearing on iOS?

- Clear app from home screen and reinstall
- Hard refresh in Safari (Cmd+Shift+R)
- Check that images are in `/public/splash-screens/`

### Android not showing splash?

- Clear Chrome cache
- Uninstall and reinstall the app
- Verify manifest.json is being served correctly

### Red screen without icon/name?

- Check `app/manifest.json` is accessible
- Verify `display: standalone` is set
- Check `background_color` and `theme_color` values

---

**Version**: 1.0  
**Last Updated**: April 30, 2024  
**Status**: ✅ Production Ready
