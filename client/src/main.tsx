import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✓ Service Worker registered:', registration.scope);
        console.log('PWA: Service worker active, app is installable');
        
        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// Capture the install prompt event for later use
let deferredPrompt: any;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('PWA: beforeinstallprompt event fired - app is installable!');
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  
  // Optionally show your own install button
  // You can use this event to show a custom install UI
  window.dispatchEvent(new CustomEvent('pwa-installable'));
});

window.addEventListener('appinstalled', () => {
  console.log('PWA: App was installed successfully');
  deferredPrompt = null;
});

// Make install function available globally for testing
(window as any).installPWA = async () => {
  if (!deferredPrompt) {
    console.log('PWA: Install prompt not available');
    return false;
  }
  
  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`PWA: User response to install prompt: ${outcome}`);
  
  // Clear the deferredPrompt for next time
  deferredPrompt = null;
  return outcome === 'accepted';
};

