// Typed, validated access to environment variables.
// Throws early with a clear message if a required var is missing at runtime.

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : undefined;
}

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get storageBucket() {
    return process.env.SUPABASE_STORAGE_BUCKET || "job-files";
  },
  get deepgramApiKey() {
    return optional("DEEPGRAM_API_KEY");
  },
  get deepgramApiUrl() {
    return process.env.DEEPGRAM_API_URL || "https://api.deepgram.com/v1/listen";
  },
  get mistralApiKey() {
    return optional("MISTRAL_API_KEY");
  },
  /** Optional — voice STT structuring after Deepgram (Mark: GPT-4o mini / 4.1). */
  get openaiApiKey() {
    return optional("OPENAI_API_KEY");
  },
  get openaiVoiceModel() {
    return optional("OPENAI_VOICE_MODEL") || "gpt-4o-mini";
  },
  get resendApiKey() {
    return optional("RESEND_API_KEY");
  },
  get resendFromAddress() {
    return process.env.RESEND_FROM_ADDRESS || "onboarding@resend.dev";
  },
  get stripeSecretKey() {
    return required("STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret() {
    return required("STRIPE_WEBHOOK_SECRET");
  },
  get stripePriceIdMonthly() {
    return required("STRIPE_PRICE_ID_MONTHLY");
  },
  /** Public site origin for Checkout success/cancel + Portal return URLs. */
  get appUrl() {
    return (
      optional("NEXT_PUBLIC_APP_URL") ||
      optional("APP_URL") ||
      "http://localhost:3000"
    );
  },
  /**
   * When true, company APIs reject callers whose company.subscription_active
   * is false (except billing + auth/me). Default false so existing tenants
   * keep working until you flip this on in production.
   */
  get stripeEnforceSubscription() {
    return process.env.STRIPE_ENFORCE_SUBSCRIPTION === "true";
  },
  /** Bearer token Vercel Cron sends to /api/cron/* routes. */
  get cronSecret() {
    return optional("CRON_SECRET");
  },
};
