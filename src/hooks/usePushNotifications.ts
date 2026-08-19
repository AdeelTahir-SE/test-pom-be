"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getExistingPushSubscription,
  pushSupported,
  reconcilePushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/client/subscribe";

export function usePushNotifications(enabled = true) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const refresh = useCallback(async () => {
    const canPush = pushSupported();
    setSupported(canPush);
    setPermission(canPush ? Notification.permission : "unsupported");
    if (!canPush || !enabled) {
      setSubscribed(false);
      return;
    }
    const subscription = await getExistingPushSubscription();
    setSubscribed(!!subscription);
    if (subscription && Notification.permission === "granted") {
      void reconcilePushSubscription();
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    setSubscribing(true);
    try {
      await subscribeToPush();
      await refresh();
    } finally {
      setSubscribing(false);
    }
  }, [refresh]);

  const disable = useCallback(async () => {
    setSubscribing(true);
    try {
      await unsubscribeFromPush();
      await refresh();
    } finally {
      setSubscribing(false);
    }
  }, [refresh]);

  return { supported, permission, subscribed, subscribing, enable, disable, refresh };
}
