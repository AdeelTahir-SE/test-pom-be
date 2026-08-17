import webpush from "web-push";
import { env } from "@/lib/env";
import type { PushNotificationPayload } from "@/lib/notifications/payloads";

let configured = false;

function configureWebPush() {
  if (configured) return;
  if (!env.vapidPublicKey || !env.vapidPrivateKey) {
    throw new Error("Missing VAPID keys. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.");
  }
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
  configured = true;
}

export async function sendPush(input: {
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
  };
  payload: PushNotificationPayload;
}) {
  configureWebPush();
  return webpush.sendNotification(
    {
      endpoint: input.subscription.endpoint,
      keys: {
        p256dh: input.subscription.p256dh,
        auth: input.subscription.auth,
      },
    },
    JSON.stringify(input.payload),
    { TTL: 60 * 60 }
  );
}
