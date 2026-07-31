"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/useLanguage";
import { api } from "@/lib/api-client";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import {
  AuraLabel,
  AuraInput,
  AuraSelect,
  AuraCheckbox,
  auraCard,
  auraButton,
} from "./AuraForm";

interface TeamUser {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "manager" | "worker";
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

interface TeamManagementModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
  onChanged?: () => void;
  isOwner?: boolean;
  onAddMember?: () => void;
}

export function TeamManagementModal({ isOpen, onOpenChange, currentUserId, onChanged, isOwner, onAddMember }: TeamManagementModalProps) {
  const { t } = useLanguage();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editCountryCode, setEditCountryCode] = useState("+386");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<"worker" | "manager">("worker");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
  setLoading(true);

  try {
    const res = await api.get<{ users: TeamUser[] }>("/api/users");
    setUsers(res.data?.users ?? []);
  } catch (err) {
    console.error(err);
    setUsers([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  const startEdit = (u: TeamUser) => {
    setEditingUser(u);
    setEditName(u.full_name);
    const phone = u.phone ?? "";

const countryCodes = ["+386", "+385", "+387", "+381", "+40", "+43", "+49", "+39"];

const matchedCountryCode = countryCodes.find((code) =>
  phone.startsWith(code)
);

if (matchedCountryCode) {
  setEditCountryCode(matchedCountryCode);
  setEditPhone(phone.slice(matchedCountryCode.length).trim());
} else {
  setEditCountryCode("+386");
  setEditPhone(phone.replace(/^\+/, "").trim());
}
    setEditRole(u.role === "manager" ? "manager" : "worker");
    setEditActive(u.is_active);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    const fullPhone = editPhone ? `${editCountryCode}${editPhone}` : "";

if (editPhone && !isValidPhone(fullPhone)) {
  alert(t("modalPhoneInvalid"));
  setSaving(false);
  return;
}

// Owner self-edit: name + phone only (role/active stay immutable).
const payload =
      editingUser.role === "owner"
        ? {
            full_name: editName,
            phone: normalizePhone(fullPhone) ?? undefined,
          }
        : {
            full_name: editName,
            phone: normalizePhone(fullPhone) ?? undefined,
            role: editRole,
            is_active: editActive,
          };
    const res = await api.patch(`/api/users/${editingUser.id}`, payload);
    setSaving(false);
    if (res.status === 200) {
      setEditingUser(null);
      await load();
      onChanged?.();
    } else {
      alert(res.error?.message ?? "Uporabnika ni bilo mogoče posodobiti.");
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) setEditingUser(null);
      }}
    >
      <DialogContent className="max-w-lg w-[90vw] max-h-[80vh] overflow-y-auto">
        <div className={auraCard}>
          {!editingUser ? (
            <div className="flex flex-col gap-4 text-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">{t("teamTitle")}</h3>
                {isOwner && onAddMember && (
                  <button
                    type="button"
                    onClick={onAddMember}
                    className="text-xs font-semibold text-[#1B3A6B] hover:underline"
                  >
                    {t("teamAddMember")}
                  </button>
                )}
              </div>

              {loading && <p className="text-sm text-slate-400 text-center">{t("officeLoading")}</p>}

              <div className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-100">
                {!loading && users.length === 0 && (
                  <p className="px-3 py-4 text-sm text-slate-400 text-center">—</p>
                )}
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      // Owner may edit their own phone (call-office); other owners locked.
                      if (u.role === "owner" && u.id !== currentUserId) return;
                      startEdit(u);
                    }}
                    disabled={u.role === "owner" && u.id !== currentUserId}
                    className="flex items-center justify-between px-3 py-3 text-left hover:bg-slate-50 disabled:hover:bg-transparent disabled:cursor-default transition-colors bg-transparent border-none"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-800">{u.full_name}</span>
                      <span className="text-xs text-slate-400">{u.email}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {u.role}
                      </span>
                      {!u.is_active && (
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                          {t("teamInactive")}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 text-slate-800">
              <div className="text-center">
                <h3 className="text-xl font-semibold tracking-tight text-slate-900">{t("teamEditTitle")}</h3>
              </div>

              <div>
                <AuraLabel strong>{t("modalWorkerNameLabel")}</AuraLabel>
                <AuraInput
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={25}
                  required
                  strong
                />
              </div>

              <div>
                <AuraLabel>{t("modalPhoneLabel")}</AuraLabel>
                <div className="flex items-center gap-2">
                  <select
                    value={editCountryCode}
                    onChange={(e) => setEditCountryCode(e.target.value)}
                    className="w-20 h-10 px-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:border-blue-400"
                  >
                    <option value="+386">+386</option>
<option value="+385">+385</option>
<option value="+387">+387</option>
<option value="+381">+381</option>
<option value="+40">+40</option>
<option value="+43">+43</option>
<option value="+49">+49</option>
<option value="+39">+39</option>
                  </select>
                  <AuraInput
  type="tel"
  inputMode="tel"
  placeholder="30 123 456"
  value={editPhone}
  onChange={(e) => setEditPhone(e.target.value.replace(/[^0-9\s]/g, ""))}
  className="flex-1"
/>
                </div>
              </div>

              {editingUser.role !== "owner" && (
                <>
                  <div>
                    <AuraLabel>{t("modalWorkerRoleLabel")}</AuraLabel>
                    <AuraSelect value={editRole} onChange={(e) => setEditRole(e.target.value as "worker" | "manager")}>
                      <option value="worker">{t("modalWorkerRoleWorker")}</option>
                      <option value="manager">{t("modalWorkerRoleManager")}</option>
                    </AuraSelect>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {editRole === "manager" ? t("modalWorkerRoleManagerHelper") : t("modalWorkerRoleWorkerHelper")}
                    </p>
                  </div>

                  <AuraCheckbox
                    checked={editActive}
                    onChange={setEditActive}
                    label={t("teamActiveLabel")}
                  />
                  {editingUser.id === currentUserId && !editActive && (
                    <p className="text-[11px] text-red-500">{t("teamCannotDeactivateSelf")}</p>
                  )}
                </>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  {t("modalCancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={saving || !editName.trim()}
                  className={`${auraButton} flex-1 w-auto disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {saving ? t("modalUploading") : t("teamSave")}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
