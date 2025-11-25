# PWA Setup - Gallery Digital Products

## Overview

Your app is now a **Progressive Web App (PWA)** that can be installed on mobile devices and desktops, providing an app-like experience.

## ✅ What's Installed

### 1. Manifest File (`/public/manifest.json`)
- App name: "Gallery - Digital Products"
- Theme color: Indigo (#6366f1)
- Display mode: Standalone (looks like native app)
- Icons: 192x192 and 512x512 PNG
- Shortcuts for quick access to Browse and Orders

### 2. Service Worker (`/public/service-worker.js`)
- Caches static assets for offline access
- Network-first strategy for API calls
- Cache-first strategy for images and static files
- Automatic cache updates

### 3. App Icons
Generated from SVG with gradient design:
- `icon-192.png` - Standard app icon
- `icon-512.png` - High-resolution app icon
- `apple-touch-icon.png` - iOS home screen icon
- `icon.svg` - Source vector file

### 4. PWA Meta Tags (`/client/index.html`)
- Manifest link
- Theme color
- Apple Touch Icon support
- Viewport configuration
- App description

### 5. Service Worker Registration (`/client/src/main.tsx`)
- Automatically registers service worker on page load
- Checks for updates every hour
- Logs registration status to console

## 📱 How to Install

### On Mobile (Android/iOS)

1. **Visit the website** on your mobile device
2. Look for the **"Add to Home Screen"** prompt
3. Or tap the browser menu (⋮ or share icon)
4. Select **"Add to Home Screen"** or **"Install App"**
5. The app icon will appear on your home screen

### On Desktop (Chrome/Edge)

1. **Visit the website** on Chrome or Edge
2. Look for the **install icon** (⊕) in the address bar
3. Click it and confirm installation
4. The app will open in a standalone window

## 🧪 Testing the PWA

### Check PWA Status in Browser DevTools

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Check:
   - **Manifest**: Should show all app details
   - **Service Workers**: Should be "activated and running"
   - **Storage**: Check cached files

### Test Installation Criteria

Open **Lighthouse** tab in DevTools:
1. Select "Progressive Web App" category
2. Click "Generate report"
3. Should pass all PWA checks

### Test Offline Functionality

1. Open the app
2. In DevTools, go to **Network** tab
3. Check "Offline" mode
4. Refresh the page
5. App should still load (from cache)

## 🔧 Updating PWA Files

### Update Icons

1. Edit `/public/icon.svg` with your design
2. Run: `npm run generate-icons`
3. Rebuild: `npm run build`

### Update Manifest

Edit `/public/manifest.json`:
```json
{
  "name": "Your App Name",
  "short_name": "Short Name",
  "theme_color": "#your-color",
  "description": "Your description"
}
```

### Update Service Worker Caching

Edit `/public/service-worker.js`:
- Change `CACHE_NAME` version to force update
- Modify `PRECACHE_URLS` to add/remove cached files
- Adjust caching strategies

## 📊 PWA Features

### ✅ Current Features
- ✅ Installable on home screen
- ✅ Standalone display mode
- ✅ Custom app icons
- ✅ Offline support for static assets
- ✅ Fast loading with cache-first strategy
- ✅ Theme color matches app design
- ✅ Auto-updates service worker

### 🚀 Future Enhancements (Optional)
- 📳 Push notifications
- 📥 Background sync
- 📍 Geolocation features
- 📷 Camera/file access
- 💾 Advanced offline storage
- 🔔 Update notifications

## 🌐 Deployment Checklist

### Before Deploying to Production

1. **HTTPS Required**: PWA only works on HTTPS (or localhost)
2. **Update URLs**: Ensure all URLs in manifest are production URLs
3. **Test on real devices**: Test installation on actual mobile devices
4. **Verify service worker scope**: Check it's serving from root `/`
5. **Update cache version**: Change `CACHE_NAME` in service worker
6. **Add screenshots**: Optional but recommended for manifest

### On Render.com (Your Current Host)

✅ HTTPS is automatic
✅ Service worker will work immediately
✅ Users can install from any mobile browser

### Testing Production PWA

```bash
# After deploying
1. Visit your production URL on mobile
2. Chrome will show "Add to Home Screen" banner
3. Install and test offline functionality
```

## 📱 Browser Support

| Browser | Desktop Install | Mobile Install | Service Worker |
|---------|----------------|----------------|----------------|
| Chrome | ✅ | ✅ | ✅ |
| Edge | ✅ | ✅ | ✅ |
| Safari | ❌ | ✅ (Add to Home) | ✅ |
| Firefox | ❌ | ✅ | ✅ |
| Opera | ✅ | ✅ | ✅ |

## 🐛 Troubleshooting

### "Service Worker registration failed"
- Ensure running on HTTPS or localhost
- Check console for specific errors
- Verify `/service-worker.js` is accessible

### "Add to Home Screen" doesn't appear
- Ensure HTTPS is enabled
- Check manifest.json is valid
- Verify icons are accessible
- Try different browser (Chrome works best)

### App doesn't work offline
- Check Service Worker is active in DevTools
- Verify CACHE_NAME matches in service worker
- Clear cache and re-register service worker

### Icons not showing
- Run `npm run generate-icons`
- Check `/public/icon-*.png` files exist
- Verify manifest.json icon paths are correct

## 📚 Resources

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

## 💰 Cost Comparison

| Method | Cost | Time | App Store |
|--------|------|------|-----------|
| **PWA (Current)** | FREE | ✅ Done | No store needed |
| Capacitor Wrap | $99-124/year | 1-2 weeks | Yes |
| React Native | $10k-30k | 2-3 months | Yes |

## 🎉 Next Steps

1. **Test on mobile device**: Visit your deployed URL and install
2. **Customize icons**: Update `/public/icon.svg` with your branding
3. **Add screenshots**: Optional manifest screenshots for better install prompt
4. **Monitor usage**: Check PWA install analytics in production
5. **Consider push notifications**: If you need user engagement features

---

**Your app is now installable! 🚀**

Users can add it to their home screen and use it like a native app, with offline support and fast loading times.
