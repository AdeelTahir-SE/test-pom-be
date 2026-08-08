'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/lib/useLanguage';
import { isValidPhone, normalizePhone } from '@/lib/phone';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Building2, Eye, EyeOff } from 'lucide-react';

interface AddWorkerCardProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // Strogo Promise<void> - parent MORA vrniti promise, da lahko komponenta
  // pravilno počaka na rezultat in ob napaki ne zapre/počisti obrazca.
  onAddWorker: (worker: {
    name: string;
    phone: string;
    email: string;
    role: 'worker' | 'manager';
    password: string;
  }) => Promise<void>;
  existingUsers?: {
    full_name: string;
    role: string;
  }[];
}

// Vloge, ki štejejo za "Pisarna" sekcijo (case-insensitive primerjava)
const OFFICE_ROLES = ['manager', 'owner', 'director'];
const PASSWORD_REGEX = /^\d{4}$/;

function normalizeRole(role?: string): string {
  return (role ?? '').trim().toLowerCase();
}

export function AddWorkerCard({
  isOpen,
  onOpenChange,
  onAddWorker,
  existingUsers = [],
}: AddWorkerCardProps) {
  const { t } = useLanguage();
  const { user, company } = useCurrentUser();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'worker' | 'manager'>('worker');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const officeUsers = existingUsers.filter((u) =>
    OFFICE_ROLES.includes(normalizeRole(u.role))
  );
  const fieldUsers = existingUsers.filter(
    (u) => normalizeRole(u.role) === 'worker'
  );

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setRole('worker');
    setPassword('');
    setShowPassword(false);
    setNameError(null);
    setEmailError(null);
    setPhoneError(null);
    setPasswordError(null);
    setSubmitError(null);
  };

  // Obrazec se povsem resetira vsakič, ko se dialog na novo odpre -
  // stari errorji/geslo iz prejšnjega (morda neuspešnega) poskusa ne ostanejo vidni.
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhone(value);

    if (value && !isValidPhone(value)) {
      setPhoneError(t('modalPhoneInvalid') || 'Neveljavna številka');
    } else {
      setPhoneError(null);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (nameError) setNameError(null);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // dovolimo samo številke, max 4 znaki
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPassword(digitsOnly);
    if (passwordError) setPasswordError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onOpenChange(false);
  };

  const validate = (): boolean => {
    let valid = true;

    if (!name.trim()) {
      setNameError('Ime je obvezno.');
      valid = false;
    }

    if (!email.trim()) {
      setEmailError('Email je obvezen.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Vnesi veljaven email naslov.');
      valid = false;
    }

    if (phone && !isValidPhone(phone)) {
      setPhoneError(t('modalPhoneInvalid') || 'Neveljavna številka');
      valid = false;
    }

    if (!PASSWORD_REGEX.test(password)) {
      setPasswordError('Geslo mora vsebovati natanko 4 številke.');
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onAddWorker({
        name: name.trim(),
        phone: normalizePhone(phone) ?? '',
        email: email.trim(),
        role,
        password,
      });
      // Modal se zapre in obrazec počisti samo ob uspehu
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Napaka pri dodajanju sodelavca. Poskusi znova.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && onOpenChange(open)}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] min-[450px]:w-[450px] min-[820px]:w-[760px] sm:max-w-[calc(100%-2rem)] outline-none mx-auto p-3 bg-[#f1f5f9] rounded-[24px] min-[820px]:rounded-[32px] border-none shadow-2xl flex flex-col gap-0"
      >
        <DialogTitle className="sr-only">Dodaj sodelavca</DialogTitle>

        {/* Statičen, hardcoded CSS - brez dangerouslySetInnerHTML.
            React dovoljuje navaden string kot child <style> elementa,
            zato ni potrebe po dangerouslySetInnerHTML za statično vsebino. */}
        <style>{`
          .custom-ios-scrollbar::-webkit-scrollbar {
            width: 5px;
          }
          .custom-ios-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-ios-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(109, 119, 142, 0.45);
            border-radius: 9999px;
          }
          .custom-ios-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(109, 119, 142, 0.65);
          }
        `}</style>

        {/* Enoten gumb za zapiranje - viden na VSEH širinah zaslona */}
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          aria-label="Zapri"
          className="absolute top-6 right-6 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 shadow-sm border border-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="flex flex-col min-[820px]:flex-row items-stretch w-full" style={{ gap: '12px' }}>
          {/* Left Column */}
          <div className="hidden min-[820px]:flex w-full min-[820px]:w-[260px] flex-col" style={{ gap: '12px' }}>
            {/* PROFIL Card */}
            <div className="relative bg-white rounded-[20px] p-6 shadow-sm border border-slate-100 flex flex-col">
              <div className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-4">Profil</div>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[14px] bg-[#2b5493] text-white flex items-center justify-center shadow-md shadow-blue-900/20 shrink-0">
                  <Building2 className="w-7 h-7" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <div className="font-semibold text-[#0f172a] text-[14px] truncate">{company?.name || 'Asd'}</div>
                  <div className="text-[#64748b] text-[12px] font-normal mt-0.5 truncate">{user?.email || ''}</div>
                </div>
              </div>
            </div>

            {/* MEMBERS LIST Card */}
            <div className="bg-white rounded-[20px] p-6 shadow-sm border border-slate-100 flex-1 flex flex-col justify-between">
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[220px] pr-1 custom-ios-scrollbar">
                {/* PISARNA Section */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    PISARNA
                  </div>
                  <div className="flex flex-col gap-1">
                    {officeUsers.length > 0 ? (
                      officeUsers.map((u, i) => (
                        <div key={`office-${i}-${u.full_name}-${u.role}`} className="flex items-center gap-1.5 text-[12px] font-light text-[#19233B] leading-none py-0.5">
                          <div className="w-[3px] h-[3px] rounded-full bg-[#19233B] shrink-0"></div>
                          <span className="truncate">{u.full_name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] italic text-slate-400 pl-3">Ni članov</div>
                    )}
                  </div>
                </div>

                {/* TEREN Section */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    TEREN
                  </div>
                  <div className="flex flex-col gap-1">
                    {fieldUsers.length > 0 ? (
                      fieldUsers.map((u, i) => (
                        <div key={`field-${i}-${u.full_name}-${u.role}`} className="flex items-center gap-1.5 text-[12px] font-light text-[#19233B] leading-none py-0.5">
                          <div className="w-[3px] h-[3px] rounded-full bg-[#19233B] shrink-0"></div>
                          <span className="truncate">{u.full_name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] italic text-slate-400 pl-3">Ni članov</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-8 shrink-0">
                <div className="w-full h-1.5 bg-[#cbd5e1] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2b5493] rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(password.length, 4) * 25}%` }}
                  ></div>
                </div>
                <div className="text-right text-[11px] text-slate-700 font-bold mt-2">{Math.min(password.length, 4)}/4 številke</div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="relative flex-1 bg-white rounded-[24px] p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col">
            <h2 className="text-[22px] font-bold text-[#0f172a] mb-1 pr-8">Dodaj sodelavca</h2>
            <p className="text-slate-500 text-[13px] font-medium mb-6">Vnesi podatke novega zaposlenega.</p>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              {/* Ime */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">Ime</label>
                <input
                  className={`w-full h-11 px-4 rounded-[8px] border ${nameError ? 'border-red-300 ring-1 ring-red-300 bg-red-50' : 'border-slate-300 bg-[#F1F5F9]'} text-[#0f172a] text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-[#1c305a]/20 focus:border-[#1c305a] transition-all placeholder:text-slate-400`}
                  value={name}
                  onChange={handleNameChange}
                  placeholder="Ime"
                />
                {nameError && <p className="text-red-600 text-[11px] font-medium mt-1">{nameError}</p>}
              </div>

              {/* Mobilna Številka & Email */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">Mobilna Številka</label>
                  <input
                     type="tel"
                     inputMode="tel"
                     className={`w-full h-11 px-4 rounded-[8px] border ${phoneError ? 'border-red-300 ring-1 ring-red-300 bg-red-50' : 'border-slate-300 bg-[#F1F5F9]'} text-[#0f172a] text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-[#1c305a]/20 focus:border-[#1c305a] transition-all placeholder:text-slate-400`}
                     value={phone}
                     onChange={handlePhoneChange}
                     placeholder="05X-648-043"
                  />
                  {phoneError && <p className="text-red-600 text-[11px] font-medium mt-1">{phoneError}</p>}
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">Email</label>
                  <input
                     type="email"
                     className={`w-full h-11 px-4 rounded-[8px] border ${emailError ? 'border-red-300 ring-1 ring-red-300 bg-red-50' : 'border-slate-300 bg-[#F1F5F9]'} text-[#0f172a] text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-[#1c305a]/20 focus:border-[#1c305a] transition-all placeholder:text-slate-400`}
                     value={email}
                     onChange={handleEmailChange}
                     placeholder="email"
                  />
                  {emailError && <p className="text-red-600 text-[11px] font-medium mt-1">{emailError}</p>}
                </div>
              </div>

              <p className="text-slate-500 text-[11px] font-medium leading-relaxed">
                Op. kontakti bodo omogočili direktno komunikacijo preko glasovnih sporočil in emaila.
              </p>

              {/* Dostop Toggle */}
              <div className="mt-2 sm:mt-0">
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">Dostop</label>
                <div className="flex p-1 bg-[#f1f5f9] rounded-[10px] w-full h-[44px]">
                  <button
                    type="button"
                    onClick={() => setRole('manager')}
                    className={`flex-1 rounded-[8px] text-[11px] font-bold tracking-widest uppercase transition-all ${role === 'manager' ? 'border-[1.5px] border-[#4A6FBF] bg-white text-[#1c305a] shadow-sm' : 'border-[1.5px] border-transparent text-slate-600 hover:text-slate-800'}`}
                  >
                    Pisarna
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('worker')}
                    className={`flex-1 rounded-[8px] text-[11px] font-bold tracking-widest uppercase transition-all ${role === 'worker' ? 'border-[1.5px] border-[#4A6FBF] bg-white text-[#1c305a] shadow-sm' : 'border-[1.5px] border-transparent text-slate-600 hover:text-slate-800'}`}
                  >
                    Teren
                  </button>
                </div>
              </div>

              {/* Začasno Geslo */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">Začasno Geslo (4 številke)</label>
                <div className="relative">
                  <input
                     type={showPassword ? 'text' : 'password'}
                     inputMode="numeric"
                     autoComplete="new-password"
                     className={`w-full h-11 pl-4 pr-11 rounded-[8px] border ${passwordError ? 'border-red-300 ring-1 ring-red-300 bg-red-50' : 'border-slate-300 bg-[#F1F5F9]'} text-[#0f172a] text-[16px] tracking-[0.5em] text-center font-bold focus:outline-none focus:ring-1 focus:ring-[#1c305a]/20 focus:border-[#1c305a] transition-all placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-light`}
                     value={password}
                     onChange={handlePasswordChange}
                     placeholder="284"
                     maxLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Skrij geslo' : 'Pokaži geslo'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && <p className="text-red-600 text-[11px] font-medium mt-1">{passwordError}</p>}
              </div>

              {submitError && (
                <p className="text-red-600 text-[12px] font-medium -mt-1">{submitError}</p>
              )}

              {/* Footer Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 h-[48px] rounded-[8px] border border-slate-200 bg-[#f8fafc] text-slate-700 font-bold text-[12px] uppercase tracking-widest hover:bg-[#f1f5f9] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prekliči
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-[48px] rounded-[8px] bg-[#0a1128] text-white font-bold text-[12px] uppercase tracking-widest shadow-lg shadow-[#0a1128]/20 hover:bg-[#152042] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Dodajam…' : 'Dodaj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
