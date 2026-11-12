/** Running from the Home Screen (standalone), not in a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

/** iPhone or iPad Safari (iPadOS reports itself as a Mac with touch). */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** iPhone Safari where the app isn't installed yet: show the install guide first. */
export const shouldShowInstallGuide = () => isIOS() && !isStandalone();

export function registerServiceWorker() {
  // Only in production builds: in development it would serve stale pages while editing.
  if (process.env.NODE_ENV !== "production" || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  // Service workers need HTTPS (or localhost). On plain http over Wi-Fi this quietly does nothing.
  navigator.serviceWorker
    .register("/sw.js")
    .then(() => navigator.serviceWorker.ready)
    .then((reg) => {
      // The first visit loaded its files before the worker existed; hand it their addresses so
      // the very first launch already works offline.
      const urls = performance
        .getEntriesByType("resource")
        .map((e) => e.name)
        .filter((u) => u.startsWith(location.origin) && /\/_next\/static\//.test(u));
      reg.active?.postMessage({ type: "precache", urls: [...urls, location.href] });
    })
    .catch(() => undefined);
}
