import {
  isValidBusinessModule,
  type BusinessModule,
} from "@/config/business-modules";

/** sessionStorage key for company fields collected before Google OAuth (a11 #9). */
export const PENDING_GOOGLE_REGISTER_KEY = "aura_pending_google_register";

export type PendingGoogleRegister = {
  company_name: string;
  business_module: BusinessModule;
  full_name?: string;
};

export function savePendingGoogleRegister(data: PendingGoogleRegister): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_GOOGLE_REGISTER_KEY, JSON.stringify(data));
}

export function readPendingGoogleRegister(): PendingGoogleRegister | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_GOOGLE_REGISTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingGoogleRegister>;
    const company_name =
      typeof parsed.company_name === "string" ? parsed.company_name.trim() : "";
    if (!company_name || !isValidBusinessModule(parsed.business_module)) return null;
    const full_name =
      typeof parsed.full_name === "string" && parsed.full_name.trim()
        ? parsed.full_name.trim()
        : undefined;
    return {
      company_name,
      business_module: parsed.business_module,
      ...(full_name ? { full_name } : {}),
    };
  } catch {
    return null;
  }
}

export function clearPendingGoogleRegister(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_GOOGLE_REGISTER_KEY);
}
