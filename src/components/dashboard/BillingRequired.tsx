"use client";

import React, { useEffect, useState } from "react";
import { CreditCard, LockKeyhole, LogOut, Phone } from "lucide-react";
import { api } from "@/lib/api-client";
import type { CurrentCompany, CurrentUser, OfficeContact } from "@/lib/useCurrentUser";
import { isAugust2026LaunchDiscountActive } from "@/lib/billing/launchDiscount";
import { toTelHref } from "@/lib/phone";

interface BillingRequiredProps {
  user: CurrentUser;
  company: CurrentCompany;
  officeContact?: OfficeContact | null;
  onLogout: () => void;
  onActivated?: () => void;
}

export function BillingRequired({
  user,
  company,
  officeContact,
  onLogout,
  onActivated,
}: BillingRequiredProps) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const isOwner = user.role === "owner";
  const launchDiscount = isAugust2026LaunchDiscountActive();
  const phoneHref = toTelHref(officeContact?.phone ?? "") ?? undefined;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing") !== "success") return;
    const sessionId = params.get("session_id");

    let cancelled = false;
    setPolling(true);
    setStatus("Plačilo je prejeto. Aktiviramo naročnino ...");

    const activate = () => {
      setStatus("Naročnina je aktivna.");
      onActivated?.();
      window.setTimeout(() => window.location.reload(), 500);
    };

    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      if (sessionId && attempts === 1) {
        const syncRes = await api.post<{
          subscription_active: boolean;
          subscription_status: string | null;
        }>("/api/billing/sync", { session_id: sessionId });
        if (cancelled) return;
        if (syncRes.status === 200 && syncRes.data?.subscription_active) {
          activate();
          return;
        }
      }

      const res = await api.get<{
        subscription_active: boolean;
        subscription_status: string | null;
        subscription_current_period_end: string | null;
        subscription_cancel_at_period_end: boolean;
      }>("/api/billing/status");
      if (cancelled) return;
      if (res.status === 200 && res.data?.subscription_active) {
        activate();
        return;
      }
      if (attempts < 10) {
        window.setTimeout(poll, 1500);
        return;
      }
      setPolling(false);
      setStatus("Plačilo je v obdelavi. Osvežite stran čez nekaj trenutkov.");
    };
    void poll();

    return () => {
      cancelled = true;
    };
  }, [onActivated]);

  const startCheckout = async () => {
    if (!isOwner || busy) return;
    setBusy(true);
    setStatus(null);
    const res = await api.post<{ url: string }>("/api/billing/checkout", {});
    setBusy(false);
    if (res.status === 200 && res.data?.url) {
      window.location.href = res.data.url;
      return;
    }
    setStatus(res.error?.message ?? "Plačilnega sistema ni bilo mogoče odpreti.");
  };

  return (
    <main className="min-h-screen bg-[#f3f5f8] px-4 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center">
        <section className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase text-slate-400">
                {company.name}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Naročnina je potrebna
              </h1>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <LockKeyhole className="h-5 w-5" aria-hidden />
            </div>
          </div>

          {isOwner ? (
            <>
              <p className="text-sm leading-6 text-slate-600">
                Za uporabo pomocnik.net morate aktivirati mesečno naročnino.
                Redna cena je 59 EUR na mesec.
              </p>
              {launchDiscount && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  Avgustovska ponudba: prvi mesec je 29 EUR, naslednji meseci
                  se obračunajo po 59 EUR na mesec.
                </div>
              )}
              <button
                type="button"
                onClick={startCheckout}
                disabled={busy || polling}
                className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0A1128] px-4 text-sm font-semibold text-white hover:bg-[#152042] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CreditCard className="h-4 w-4" aria-hidden />
                {busy ? "Preusmerjanje ..." : "Plačaj s Stripe"}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm leading-6 text-slate-600">
                Podjetje trenutno nima aktivne naročnine. Lastnik podjetja mora
                aktivirati plačilo, preden lahko nadaljujete z uporabo.
              </p>
              {phoneHref && (
                <a
                  href={phoneHref}
                  className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Phone className="h-4 w-4" aria-hidden />
                  Pokliči pisarno
                </a>
              )}
            </>
          )}

          {status && (
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              {status}
            </p>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Odjava
          </button>
        </section>
      </div>
    </main>
  );
}
