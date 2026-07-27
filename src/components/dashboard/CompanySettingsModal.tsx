"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/useLanguage";
import { api } from "@/lib/api-client";
import { AuraLabel, AuraInput, auraCard, auraButton } from "./AuraForm";

interface CompanySettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  /** Owner-only billing actions. */
  canManageBilling?: boolean;
  subscriptionActive?: boolean;
  hasStripeCustomer?: boolean;
  onSaved?: (name: string) => void;
}

export function CompanySettingsModal({
  isOpen,
  onOpenChange,
  companyName,
  canManageBilling = false,
  subscriptionActive = true,
  hasStripeCustomer = false,
  onSaved,
}: CompanySettingsModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState(companyName);
  const [saving, setSaving] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);

  useEffect(() => {
    if (isOpen) setName(companyName);
  }, [isOpen, companyName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await api.patch<{ company: { name: string } }>("/api/companies", { name: name.trim() });
    setSaving(false);
    if (res.status === 200 && res.data) {
      onSaved?.(res.data.company.name);
      onOpenChange(false);
    } else {
      alert(res.error?.message ?? "Podjetja ni bilo mogoče posodobiti.");
    }
  };

  const redirectTo = async (path: "/api/billing/checkout" | "/api/billing/portal") => {
    setBillingBusy(true);
    const res = await api.post<{ url: string }>(path, {});
    setBillingBusy(false);
    if (res.status === 200 && res.data?.url) {
      window.location.href = res.data.url;
      return;
    }
    alert(res.error?.message ?? t("billingError"));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-[90vw]">
        <div className={auraCard}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-slate-800">
            <div className="text-center">
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">{t("companySettingsTitle")}</h3>
            </div>

            <div>
              <AuraLabel strong>{t("companyNameLabel")}</AuraLabel>
              <AuraInput
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                required
                strong
              />
            </div>

            <button type="submit" disabled={saving || !name.trim()} className={`${auraButton} disabled:opacity-50 disabled:cursor-not-allowed`}>
              {saving ? t("modalUploading") : t("teamSave")}
            </button>
          </form>

          {canManageBilling && (
            <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col gap-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {t("billingSectionTitle")}
              </p>
              <p className="text-xs text-slate-500">
                {subscriptionActive ? t("billingStatusActive") : t("billingStatusInactive")}
              </p>
              {!hasStripeCustomer || !subscriptionActive ? (
                <button
                  type="button"
                  disabled={billingBusy}
                  onClick={() => redirectTo("/api/billing/checkout")}
                  className={`${auraButton} disabled:opacity-50`}
                >
                  {billingBusy ? t("billingRedirecting") : t("billingSubscribe")}
                </button>
              ) : null}
              {hasStripeCustomer ? (
                <button
                  type="button"
                  disabled={billingBusy}
                  onClick={() => redirectTo("/api/billing/portal")}
                  className="w-full h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {billingBusy ? t("billingRedirecting") : t("billingManage")}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
