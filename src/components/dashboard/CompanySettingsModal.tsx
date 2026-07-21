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
  onSaved?: (name: string) => void;
}

export function CompanySettingsModal({ isOpen, onOpenChange, companyName, onSaved }: CompanySettingsModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState(companyName);
  const [saving, setSaving] = useState(false);

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
      alert(res.error?.message ?? "Failed to update company.");
    }
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
