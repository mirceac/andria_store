# PWA Installation Troubleshooting

## Quick Fixes Applied

### 1. ✅ Fixed Manifest Icons
- Changed from `"purpose": "any maskable"` to separate icons for `"any"` and `"maskable"`
- Added `"scope": "/"` field (required by some browsers)

### 2. ✅ Added Proper MIME Types
- Manifest served with `application/manifest+json`
- Service Worker served with `application/javascript`
- Added `Service-Worker-Allowed` header

### 3. ✅ Added HTML Title
- Required for PWA installability

## How to Install on Different Devices

### Android (Chrome)
1. Open your site: `https://your-render-url.onrender.com`
2. Wait 2-3 seconds on the page
3. You should see a banner at the bottom: "Add Gallery to Home screen"
4. **OR** tap the 3-dot menu → "Install app" or "Add to Home screen"

### iPhone/iPad (Safari)
**Note:** iOS doesn't show automatic prompts. You must:
1. Open Safari (NOT Chrome or other browsers)
2. Visit your site
3. Tap the **Share button** (square with arrow pointing up)
4. Scroll down and tap **"Add to Home Screen"**
5. Tap "Add" in the top right

### Desktop (Chrome/Edge)
1. Look for the install icon (⊕) in the address bar
2. Click it to install

## Diagnostic Tool

Visit this URL on your phone to check PWA status:
```
https://your-render-url.onrender.com/pwa-check.html
```

This page will:
- ✅ Check if HTTPS is working
- ✅ Verify service worker registration
- ✅ Validate manifest.json
- ✅ Check icon sizes
- ✅ Show why install prompt isn't appearing

## Common Issues

### "No install prompt appears"

**Possible causes:**
1. **Already installed** - Check your home screen
2. **iOS Safari** - No automatic prompt, use Share → Add to Home Screen
3. **Not on home page** - Navigate to main page and wait
4. **Previously dismissed** - Chrome won't show again for ~90 days
5. **Incognito/Private mode** - PWA doesn't work in private browsing

### "Service worker not registering"

Check browser console (on desktop):
```
Right-click → Inspect → Console tab
Should see: "✓ Service Worker registered"
```

### "Icons not loading"

Visit these URLs directly to verify they work:
- `https://your-url.onrender.com/icon-192.png`
- `https://your-url.onrender.com/icon-512.png`
- `https://your-url.onrender.com/manifest.json`

## Testing Checklist

### Before You Deploy:
- ✅ Rebuild: `npm run build`
- ✅ Commit and push to trigger Render deploy
- ✅ Wait for Render deployment to complete

### On Your Phone:
1. ✅ Visit the main URL (not /pwa-check.html first)
2. ✅ Stay on the page for 3-5 seconds
3. ✅ Look for install banner at bottom
4. ✅ If no banner, check browser menu for "Install" or "Add to Home Screen"
5. ✅ If still nothing, visit `/pwa-check.html` for diagnostics

### iOS Specific:
- ✅ Use Safari browser (required)
- ✅ Use Share button → Add to Home Screen
- ✅ No automatic prompt will appear

## What You Should See

### Android Chrome Install Prompt:
```
┌─────────────────────────────────┐
│ 🎨 Gallery                      │
│ Browse and purchase digital art │
│                                  │
│ [Install]  [Not now]            │
└─────────────────────────────────┘
```

### After Installation:
- App icon on home screen with name "Gallery"
- Opens in full-screen (no browser bar)
- Splash screen with your theme color
- Works offline for cached pages

## If Still Not Working

1. **Clear browser data** on your phone:
   - Settings → Apps → Chrome/Safari → Storage → Clear Cache

2. **Try different browser**:
   - Android: Chrome, Edge, Samsung Internet
   - iOS: Safari only (others don't support PWA install)

3. **Check Render logs** for errors:
   - Go to Render dashboard
   - Click your service
   - Check "Logs" tab

4. **Use the diagnostic tool**:
   - Visit `/pwa-check.html` on your phone
   - Screenshot the results
   - Check what's failing

## Next Steps

1. **Deploy to Render**: Push your code
2. **Wait for build**: Check Render dashboard
3. **Visit on phone**: Use main URL
4. **Run diagnostics**: Visit `/pwa-check.html` if needed
5. **Install**: Follow device-specific instructions above

---

**Remember:** iOS requires manual "Add to Home Screen" - there is no automatic install prompt on iPhone/iPad.
