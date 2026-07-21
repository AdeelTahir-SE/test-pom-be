import Stripe from "stripe";
import { env } from "@/lib/env";

let stripeSingleton: Stripe | null = null;

/** Lazy Stripe SDK — only constructed when billing env is configured. */
export function getStripe(): Stripe {
  if (stripeSingleton) return stripeSingleton;
  stripeSingleton = new Stripe(env.stripeSecretKey, {
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
  });
  return stripeSingleton;
}

export function appBaseUrl(): string {
  return env.appUrl.replace(/\/$/, "");
}
