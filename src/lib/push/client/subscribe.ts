import { api } from "@/lib/api-client";
import { registerServiceWorker } from "@/lib/push/client/register";

function vapidPublicKeyToApplicationServerKey(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  if (output.byteLength !== 65) {
    throw new Error("Invalid VAPID public key.");
  }
  return output.buffer.slice(
    output.byteOffset,
    output.byteOffset + output.byteLength
  );
}

function isPushServiceAbort(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    error.name === "AbortError" &&
    error.message.toLowerCase().includes("push service")
  );
}

function pushServiceFailureMessage(): string {
  return (
    "Browser push service registration failed. Try Google Chrome or Firefox with push services enabled. " +
    "Realtime in-app messaging still works without Web Push."
  );
}

async function resetPushRegistration(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

async function createBrowserPushSubscription(
  registration: ServiceWorkerRegistration,
  publicKey: string
): Promise<PushSubscription> {
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidPublicKeyToApplicationServerKey(publicKey),
  });
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const registration = await registerServiceWorker();
  return registration ? registration.pushManager.getSubscription() : null;
}

export async function subscribeToPush(): Promise<PushSubscription> {
  if (!pushSupported()) throw new Error("Browser push is not supported.");
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");

  const registration = await registerServiceWorker();
  if (!registration) throw new Error("Service worker could not be registered.");

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    try {
      subscription = await createBrowserPushSubscription(registration, publicKey);
    } catch (err) {
      if (!isPushServiceAbort(err)) throw err;
      await resetPushRegistration();
      const retryRegistration = await registerServiceWorker();
      if (!retryRegistration) throw new Error("Service worker could not be registered.");
      try {
        subscription = await createBrowserPushSubscription(retryRegistration, publicKey);
      } catch (retryErr) {
        if (isPushServiceAbort(retryErr)) throw new Error(pushServiceFailureMessage());
        throw retryErr;
      }
    }
  }

  const json = subscription.toJSON();
  const res = await api.post("/api/push/subscribe", {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    },
    userAgent: navigator.userAgent,
  });
  if (res.status >= 400) {
    throw new Error(res.error?.message ?? "Failed to save push subscription.");
  }

  return subscription;
}

export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return;

  await fetch("/api/push/subscribe", {
    method: "DELETE",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}

export async function reconcilePushSubscription(): Promise<boolean> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return false;
  const json = subscription.toJSON();
  const res = await api.post("/api/push/subscribe", {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    },
    userAgent: navigator.userAgent,
  });
  if (res.status >= 400) {
    throw new Error(res.error?.message ?? "Failed to save push subscription.");
  }
  return true;
}
