"use client";

import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/useLanguage";
import {
  AuraLabel,
  AuraInput,
  AuraSelect,
  auraCard,
  auraButton,
} from "./AuraForm";
import { isValidPhone, normalizePhone, toTelHref } from "@/lib/phone";

interface AddWorkerCardProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddWorker: (worker: {
    name: string;
    phone: string;
    email: string;
    role: "worker" | "manager";
    password: string;
  }) => void;
}

export function AddWorkerCard({ isOpen, onOpenChange, onAddWorker }: AddWorkerCardProps) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+386");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"worker" | "manager">("worker");
  const [password, setPassword] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const sanitizePhone = (raw: string) => raw.replace(/[^0-9\s]/g, "");

  const handlePhoneChange = (raw: string) => {
    const sanitized = sanitizePhone(raw);
    setPhone(sanitized);
    const fullPhone = `${countryCode}${sanitized}`;
    if (sanitized && !isValidPhone(fullPhone)) {
      setPhoneError(t("modalPhoneInvalid"));
    } else {
      setPhoneError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    if (role === "manager" && password.length < 8) return;
    const fullPhone = phone ? `${countryCode}${phone}` : "";
    if (phone && !isValidPhone(fullPhone)) {
      setPhoneError(t("modalPhoneInvalid"));
      return;
    }

    onAddWorker({
      name,
      phone: normalizePhone(fullPhone) ?? "",
      email,
      role,
      password: role === "manager" ? password : "",
    });

    setName("");
    setCountryCode("+386");
    setPhone("");
    setEmail("");
    setRole("worker");
    setPassword("");
    setPhoneError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          style={{
            background: "transparent",
            border: "none",
            boxShadow: "none",
            padding: 0,
            maxWidth: "380px",
            width: "90%",
          }}
          className="outline-none"
        >
          <div className={auraCard}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-slate-800">
              {/* Header */}
              <div className="text-center">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                  {t("modalWorkerTitle")}
                </h3>
              </div>

              <div className="flex flex-col gap-5">
                {/* Ime — required */}
                <div>
                  <AuraLabel strong>{t("modalWorkerNameOnlyLabel")}</AuraLabel>
                  <AuraInput
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={25}
                    required
                    strong
                    placeholder={t("modalWorkerNamePlaceholder")}
                  />
                </div>

                {/* Telefon */}
                <div>
                  <AuraLabel>{t("modalWorkerPhoneOnlyLabel")}</AuraLabel>
                  <div className="flex items-center gap-2">
                    <a
  href={
    phone
      ? (toTelHref(`${countryCode}${phone}`) || undefined)
      : undefined
  }
                      className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all ${
                        phone && toTelHref(`${countryCode}${phone}`)
                          ? "bg-[#1B3A6B] border-[#1B3A6B] text-white shadow-[0_4px_10px_-2px_rgba(27,58,107,0.3)]"
                          : "bg-white border-[#1B3A6B]/25 text-slate-500"
                      }`}
                    >
                      <svg width="16" height="16" viewBox="0 0 20 18" fill="currentColor">
                        <path d="M7.22477 1.25722C6.8873 0.497902 6.0702 0 5.16154 0H2.10521C0.942534 0 0 0.848098 0 1.89453C0 10.7892 8.01177 18 17.8945 18C19.0572 18 19.9995 17.1516 19.9995 16.1052L20 13.354C20 12.5362 19.4469 11.8009 18.6033 11.4971L15.674 10.4429C14.9161 10.1701 14.0533 10.2929 13.4263 10.7632L12.6702 11.3307C11.7873 11.9929 10.4882 11.9402 9.67552 11.2088L7.54672 9.29106C6.73403 8.55963 6.67398 7.39134 7.40975 6.59669L8.04016 5.9163C8.56268 5.35196 8.70032 4.57516 8.39719 3.89309L7.22477 1.25722Z" />
                      </svg>
                    </a>
                    <select
                      value={countryCode}
                      onChange={(e) => {
  const newCountryCode = e.target.value;
  setCountryCode(newCountryCode);

  const fullPhone = `${newCountryCode}${phone}`;

  if (phone && !isValidPhone(fullPhone)) {
    setPhoneError(t("modalPhoneInvalid"));
  } else {
    setPhoneError(null);
  }
}}
                      className="w-20 h-10 px-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-blue-400"
                    >
                      <option value="+386">+386</option>
                      <option value="+49">+49</option>
                      <option value="+43">+43</option>
                      <option value="+39">+39</option>
                      <option value="+385">+385</option>
                      <option value="+381">+381</option>
                    </select>
                    <AuraInput
                      type="tel"
                      inputMode="tel"
                      placeholder="30 123 456"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  {phoneError && (
                    <span className="text-[11px] text-red-500">{phoneError}</span>
                  )}
                </div>

                {/* E-pošta — required. Visually separated: this becomes their login. */}
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                  <AuraLabel strong>{t("modalWorkerEmailOnlyLabel")} *</AuraLabel>
                  <AuraInput
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={30}
                    required
                    strong
                    placeholder={t("modalWorkerEmailPlaceholder")}
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">{t("modalWorkerEmailHelper")}</span>
                </div>

                {/* Vloga */}
                <div>
                  <AuraLabel>{t("modalWorkerRoleLabel")}</AuraLabel>
                  <AuraSelect
                    value={role}
                    onChange={(e) => {
                      const nextRole = e.target.value as "worker" | "manager";
                      setRole(nextRole);
                      if (nextRole === "worker") setPassword("");
                    }}
                  >
                    <option value="worker">{t("modalWorkerRoleWorker")}</option>
                    <option value="manager">{t("modalWorkerRoleManager")}</option>
                  </AuraSelect>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {role === "manager" ? t("modalWorkerRoleManagerHelper") : t("modalWorkerRoleWorkerHelper")}
                  </p>
                </div>

                {/* Geslo — manager only. Workers get an auto-generated login
                    code emailed to them instead (no manual password field). */}
                {role === "manager" && (
                  <div>
                    <AuraLabel>{t("modalWorkerPasswordLabel")}</AuraLabel>
                    <AuraInput
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  maxLength={72}
  placeholder={t("modalWorkerPasswordPlaceholder")}
  required
/>
                    {password && password.length < 8 && (
                      <span className="text-[11px] text-red-500">{t("modalWorkerPasswordTooShort")}</span>
                    )}
                  </div>
                )}
                {role === "worker" && (
                  <p className="text-[11px] text-slate-400 -mt-1">{t("modalWorkerAutoCodeNote")}</p>
                )}
              </div>

              <button type="submit" className={auraButton}>
                {t("modalWorkerSubmit")}
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
  );
}
