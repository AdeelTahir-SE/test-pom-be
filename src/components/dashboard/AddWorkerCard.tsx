'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/lib/useLanguage';
import { isValidPhone, normalizePhone } from '@/lib/phone';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Building2 } from 'lucide-react';

interface AddWorkerCardProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddWorker: (worker: {
    name: string;
    phone: string;
    email: string;
    role: 'worker' | 'manager';
    password: string;
  }) => void;
  existingUsers?: {
    full_name: string;
    role: string;
  }[];
}

function getInitials(name?: string): string {
  if (!name?.trim()) return "JN";

  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhone(value);

    if (value && !isValidPhone(value)) {
      setPhoneError(t('modalPhoneInvalid') || 'Neveljavna številka');
    } else {
      setPhoneError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    if (phone && !isValidPhone(phone)) {
      setPhoneError(t('modalPhoneInvalid') || 'Neveljavna številka');
      return;
    }

    onAddWorker({
      name,
      phone: normalizePhone(phone) ?? '',
      email,
      role,
      password,
    });
    setName('');
    setPhone('');
    setEmail('');
    setRole('worker');
    setPassword('');
    setPhoneError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[calc(100%-2rem)] min-[450px]:w-[450px] min-[820px]:w-[760px] sm:max-w-[calc(100%-2rem)] outline-none mx-auto p-3 bg-[#f1f5f9] rounded-[24px] min-[820px]:rounded-[32px] border-none shadow-2xl flex flex-col gap-0"
      >
        <DialogTitle className="sr-only">Dodaj sodelavca</DialogTitle>

        <style dangerouslySetInnerHTML={{ __html: `
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
        `}} />
        
        <div className="flex flex-col min-[820px]:flex-row items-stretch w-full" style={{ gap: '12px' }}>
          {/* Left Column */}
          <div className="hidden min-[820px]:flex w-full min-[820px]:w-[260px] flex-col" style={{ gap: '12px' }}>
            {/* PROFIL Card */}
            <div className="relative bg-white rounded-[20px] p-6 shadow-sm border border-slate-100 flex flex-col">
              <button 
                type="button" 
                onClick={() => onOpenChange(false)} 
                className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 min-[820px]:hidden transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
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
                    {existingUsers.filter(u => u.role === 'manager' || u.role === 'owner' || u.role === 'director').length > 0 ? (
                      existingUsers
                        .filter(u => u.role === 'manager' || u.role === 'owner' || u.role === 'director')
                        .map((u, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[12px] font-light text-[#19233B] leading-none py-0.5">
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
                    {existingUsers.filter(u => u.role === 'worker').length > 0 ? (
                      existingUsers
                        .filter(u => u.role === 'worker')
                        .map((u, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[12px] font-light text-[#19233B] leading-none py-0.5">
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
            <button 
              type="button" 
              onClick={() => onOpenChange(false)} 
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 sm:hidden transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            <h2 className="text-[22px] font-bold text-[#0f172a] mb-1">Dodaj sodelavca</h2>
            <p className="text-slate-500 text-[13px] font-medium mb-6">Vnesi podatke novega zaposlenega.</p>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Ime */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">Ime</label>
                <input 
                  className="w-full h-11 px-4 rounded-[8px] border border-slate-300 bg-[#F1F5F9] text-[#0f172a] text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-[#1c305a]/20 focus:border-[#1c305a] transition-all placeholder:text-slate-400" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Janez Novak"
                  required
                />
              </div>
              
              {/* Mobilna Številka & Email */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">Mobilna Številka</label>
                  <input 
                     className={`w-full h-11 px-4 rounded-[8px] border ${phoneError ? 'border-red-300 ring-1 ring-red-300 bg-red-50' : 'border-slate-300 bg-[#F1F5F9]'} text-[#0f172a] text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-[#1c305a]/20 focus:border-[#1c305a] transition-all placeholder:text-slate-400`}
                     value={phone}
                     onChange={handlePhoneChange}
                     placeholder="052648043"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">Email</label>
                  <input 
                     type="email"
                     className="w-full h-11 px-4 rounded-[8px] border border-slate-300 bg-[#F1F5F9] text-[#0f172a] text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-[#1c305a]/20 focus:border-[#1c305a] transition-all placeholder:text-slate-400"
                     value={email}
                     onChange={e => setEmail(e.target.value)}
                     placeholder="janez.novak@podjetje.si"
                     required
                  />
                </div>
              </div>
              <p className="hidden sm:block text-slate-500 text-[11px] font-medium leading-relaxed">
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
                <input 
                   className="w-full h-11 px-4 rounded-[8px] border border-slate-300 bg-[#F1F5F9] text-[#0f172a] text-[16px] tracking-[0.5em] text-center font-bold focus:outline-none focus:ring-1 focus:ring-[#1c305a]/20 focus:border-[#1c305a] transition-all placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-light"
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                   placeholder="2 8 4 7"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => onOpenChange(false)} className="flex-1 h-[48px] rounded-[8px] border border-slate-200 bg-[#f8fafc] text-slate-700 font-bold text-[12px] uppercase tracking-widest hover:bg-[#f1f5f9] transition-all">Prekliči</button>
                <button type="submit" className="flex-1 h-[48px] rounded-[8px] bg-[#0a1128] text-white font-bold text-[12px] uppercase tracking-widest shadow-lg shadow-[#0a1128]/20 hover:bg-[#152042] transition-all">Dodaj</button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
