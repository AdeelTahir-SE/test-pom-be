'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useLanguage } from '@/lib/useLanguage';
import {
  AuraLabel,
  AuraInput,
  AuraSelect,
  auraCard,
  auraButton,
} from './AuraForm';
import { isValidPhone, normalizePhone } from '@/lib/phone';
import { AuraPhoneInput } from './PhoneInput';

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
}

export function AddWorkerCard({
  isOpen,
  onOpenChange,
  onAddWorker,
}: AddWorkerCardProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'worker' | 'manager'>('worker');
  const [password, setPassword] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handlePhoneChange = (value: string) => {
    setPhone(value);

    if (value && !isValidPhone(value)) {
      setPhoneError(t('modalPhoneInvalid'));
    } else {
      setPhoneError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    if (role === 'manager' && password.length < 8) return;

    if (phone && !isValidPhone(phone)) {
      setPhoneError(t('modalPhoneInvalid'));
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
        style={{
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          padding: 0,
          maxWidth: '380px',
          width: '90%',
        }}
        className="outline-none"
      >
        <div className={auraCard}>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 text-slate-800"
          >
            {/* Header */}
            <div className="text-center">
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                {t('modalWorkerTitle')}
              </h3>
            </div>

            <div className="flex flex-col gap-5">
              {/* Ime — required */}
              <div>
                <AuraLabel strong>{t('modalWorkerNameOnlyLabel')}</AuraLabel>
                <AuraInput
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={25}
                  required
                  strong
                  placeholder={t('modalWorkerNamePlaceholder')}
                />
              </div>

              {/* Telefon */}
              <AuraPhoneInput
                value={phone}
                onChange={handlePhoneChange}
                label={t('modalWorkerPhoneOnlyLabel')}
                error={phoneError}
              />

              {/* E-pošta — required. Visually separated: this becomes their login. */}
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                <AuraLabel strong>{t('modalWorkerEmailOnlyLabel')} *</AuraLabel>
                <AuraInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={30}
                  required
                  strong
                  placeholder={t('modalWorkerEmailPlaceholder')}
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {t('modalWorkerEmailHelper')}
                </span>
              </div>

              {/* Vloga */}
              <div>
                <AuraLabel>{t('modalWorkerRoleLabel')}</AuraLabel>
                <AuraSelect
                  value={role}
                  onChange={(e) => {
                    const nextRole = e.target.value as 'worker' | 'manager';
                    setRole(nextRole);
                    if (nextRole === 'worker') setPassword('');
                  }}
                >
                  <option value="worker">{t('modalWorkerRoleWorker')}</option>
                  <option value="manager">{t('modalWorkerRoleManager')}</option>
                </AuraSelect>
                <p className="text-[11px] text-slate-400 mt-1">
                  {role === 'manager'
                    ? t('modalWorkerRoleManagerHelper')
                    : t('modalWorkerRoleWorkerHelper')}
                </p>
              </div>

              {/* Geslo — manager only. Workers get an auto-generated login
                    code emailed to them instead (no manual password field). */}
              {role === 'manager' && (
                <div>
                  <AuraLabel>{t('modalWorkerPasswordLabel')}</AuraLabel>
                  <AuraInput
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    maxLength={72}
                    placeholder={t('modalWorkerPasswordPlaceholder')}
                    required
                  />
                  {password && password.length < 8 && (
                    <span className="text-[11px] text-red-500">
                      {t('modalWorkerPasswordTooShort')}
                    </span>
                  )}
                </div>
              )}
              {role === 'worker' && (
                <p className="text-[11px] text-slate-400 -mt-1">
                  {t('modalWorkerAutoCodeNote')}
                </p>
              )}
            </div>

            <button type="submit" className={auraButton}>
              {t('modalWorkerSubmit')}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
