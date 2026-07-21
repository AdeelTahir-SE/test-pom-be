"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCurrentAdmin } from "@/lib/useCurrentAdmin";
import { api } from "@/lib/api-client";

interface AdminCompany {
  id: string;
  name: string;
  business_module: string;
  subscription_active: boolean;
  created_at: string;
  user_count: number;
  job_count: number;
}

interface AdminCompanyUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface AdminCompanyDetail {
  company: AdminCompany;
  users: AdminCompanyUser[];
  job_count: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { admin, loading: authLoading, logout } = useCurrentAdmin();

  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [detail, setDetail] = useState<AdminCompanyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadCompanies = useCallback(async () => {
    const res = await api.get<{ companies: AdminCompany[] }>("/api/admin/companies");
    setCompanies(res.data?.companies ?? []);
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && admin) loadCompanies();
  }, [authLoading, admin, loadCompanies]);

  const openDetail = async (companyId: string) => {
    setDetailLoading(true);
    const res = await api.get<AdminCompanyDetail>(`/api/admin/companies/${companyId}`);
    setDetailLoading(false);
    if (res.status === 200 && res.data) setDetail(res.data);
  };

  const toggleSubscription = async (company: AdminCompany, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingId(company.id);
    const res = await api.patch<{ company: AdminCompany }>(`/api/admin/companies/${company.id}`, {
      subscription_active: !company.subscription_active,
    });
    setTogglingId(null);
    if (res.status === 200 && res.data) {
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? res.data!.company : c)));
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <Logo className="h-7 w-auto" />
          <span className="h-4 w-px bg-slate-200 hidden sm:inline" />
          <span className="text-xs font-semibold text-slate-600 hidden sm:inline">Platform Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-900 hidden md:inline">{admin?.email}</span>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Companies</h1>
        <p className="text-sm text-slate-500 mb-6">
          {companies.length} compan{companies.length === 1 ? "y" : "ies"} across the platform.
        </p>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Module</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Users</th>
                <th className="px-5 py-3 text-right">Jobs</th>
                <th className="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No companies yet.
                  </td>
                </tr>
              )}
              {companies.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => openDetail(c.id)}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{c.name}</td>
                  <td className="px-5 py-3.5 text-slate-500 capitalize">{c.business_module.replace(/_/g, " ")}</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={(e) => toggleSubscription(c, e)}
                      disabled={togglingId === c.id}
                      className="cursor-pointer disabled:opacity-50"
                      title="Click to toggle"
                    >
                      <Badge variant={c.subscription_active ? "default" : "outline"}>
                        {togglingId === c.id ? "…" : c.subscription_active ? "Active" : "Inactive"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right text-slate-600">{c.user_count}</td>
                  <td className="px-5 py-3.5 text-right text-slate-600">{c.job_count}</td>
                  <td className="px-5 py-3.5 text-slate-400">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!detail || detailLoading} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detailLoading ? (
            <div className="py-10 text-center text-slate-400 text-sm">Loading…</div>
          ) : detail ? (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{detail.company.name}</h3>
                <p className="text-xs text-slate-500 capitalize">
                  {detail.company.business_module.replace(/_/g, " ")} · {detail.job_count} jobs
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Users ({detail.users.length})
                </span>
                <div className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {detail.users.length === 0 && (
                    <span className="px-3 py-3 text-sm text-slate-400">No users yet.</span>
                  )}
                  {detail.users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between px-3 py-2.5">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-800">{u.full_name}</span>
                        <span className="text-xs text-slate-400">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                        {!u.is_active && <Badge variant="destructive">Inactive</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
