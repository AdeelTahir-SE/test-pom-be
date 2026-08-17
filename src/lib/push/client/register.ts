export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}
