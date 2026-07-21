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
  get resendApiKey() {
    return optional("RESEND_API_KEY");
  },
  get resendFromAddress() {
    return process.env.RESEND_FROM_ADDRESS || "onboarding@resend.dev";
  },
};
