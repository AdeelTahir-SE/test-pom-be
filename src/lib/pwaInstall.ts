"use client";

/**
 * iOS Safari only exposes the Push API to a home-screen-installed PWA
 * (standalone display mode), so `pushSupported()` legitimately returns
 * false in an ordinary iOS Safari tab. Detect that specific case so the UI
 * can point the user at "Add to Home Screen" instead of silently hiding
 * notifications with no explanation.
 */
export function isIosInstallRequiredForPush(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!isIos) return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  const isStandalone =
    nav.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches;
  return !isStandalone;
}
