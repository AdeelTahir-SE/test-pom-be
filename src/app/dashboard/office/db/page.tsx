'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/lib/useLanguage';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { api } from '@/lib/api-client';
import {
  Users,
  Briefcase,
  FileText,
  Paperclip,
  StickyNote,
  Search,
  ArrowLeft,
  LogOut,
  ExternalLink,
  ChevronRight,
  Filter,
  AlertTriangle,
  Clock,
  Download,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TeamUser {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'manager' | 'worker';
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export default function DatabaseDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, company, loading: authLoading, logout } = useCurrentUser();

  // Active Main Tab
  // 0 = Zaposleni, 1 = Opravila, 2 = Stranke, 3 = Priponke, 4 = Pisarna
  const [activeTab, setActiveTab] = useState(0);

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Live Staff Data
  const [staffList, setStaffList] = useState<TeamUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);

  // Attachment Sub-Tabs
  // 0 = Računi (Invoices), 1 = Ostalo (Other), 2 = Slike (Photos)
  const [attachmentSubTab, setAttachmentSubTab] = useState(0);

  // Fetch Staff
  const loadStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const res = await api.get<{ users: TeamUser[] }>('/api/users');
      setStaffList(res.data?.users ?? []);
    } catch (err) {
      console.error('Failed to load staff', err);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      loadStaff();
    }
  }, [authLoading, user, loadStaff]);

  // Mock data in Slovenian for other tables
  const mockJobs = [
    {
      id: 'j-1',
      date: '23. 07. 2026',
      project: 'Čiščenje steklenih površin - Poslovna stavba',
      worker: 'Alen Kovač',
      attachments: ['skica_tlorisa.pdf', 'pred_ciscenjem.jpg'],
      status: 'v_teku',
    },
    {
      id: 'j-2',
      date: '22. 07. 2026',
      project: 'Montaža toplotne črpalke - KID d.o.o.',
      worker: 'Janez Novak',
      attachments: ['tehnicna_navodila.pdf', 'racun_predplacilo.pdf'],
      status: 'completed',
    },
    {
      id: 'j-3',
      date: '21. 07. 2026',
      project: 'Košnja trave in ureditev žive meje - Vila Blok',
      worker: 'Maks Horvat',
      attachments: ['foto_teren.jpg'],
      status: 'completed',
    },
    {
      id: 'j-4',
      date: '20. 07. 2026',
      project: 'Sanacija odtoka v kuhinji - Ana Novak',
      worker: 'Janez Novak',
      attachments: [],
      status: 'completed',
    },
    {
      id: 'j-5',
      date: '19. 07. 2026',
      project: 'Pregled električne napeljave - Blok center',
      worker: 'Alen Kovač',
      attachments: ['meritve_porocilo.pdf'],
      status: 'cancelled',
    },
  ];

  const mockCustomers = [
    {
      id: 'c-1',
      name: 'Kranjska investicijska družba d.o.o.',
      date: '01. 06. 2026',
      project: 'Montaža toplotne črpalke',
      notes:
        'Ključi od kotlovnice so na voljo pri hišniku (g. Marjan, 041-332-991).',
      reminders: 'Pokliči 1 dan prej za potrditev dostopa',
      timeline:
        'Jun 1: Ustvarjen kontakt. Jul 15: Naročen material. Jul 22: Uspešna montaža.',
    },
    {
      id: 'c-2',
      name: 'Vila Blok d.o.o.',
      date: '12. 05. 2026',
      project: 'Mesečno urejanje okolice',
      notes:
        'Urejanje žive meje izvajati izključno po 15. uri zaradi miru stanovalcev.',
      reminders: 'Mesečni opomnik vsak 20. v mesecu',
      timeline:
        'Maj 12: Podpis pogodbe o vzdrževanju. Jun 20: Izvedeno čiščenje. Jul 21: Izvedeno obrezovanje.',
    },
    {
      id: 'c-3',
      name: 'Ana Novak (Fizična stranka)',
      date: '10. 07. 2026',
      project: 'Sanacija odtoka',
      notes: 'Stranka želi račun v papirni obliki po pošti.',
      reminders: 'Ni načrtovanih opomnikov',
      timeline:
        'Jul 10: Stranka javila puščanje odtoka. Jul 20: Sanacija končana.',
    },
    {
      id: 'c-4',
      name: 'Hotel ABX Ljubljana',
      date: '03. 04. 2026',
      project: 'Generalno čiščenje sob in hodnikov',
      notes:
        'Izkušena čistilka ve podrobnosti glede čiščenja skladišča. Okna morajo biti očiščena pred odprtjem recepcije.',
      reminders: 'Preveri zadovoljstvo 3 dni po čiščenju',
      timeline:
        'Apr 3: Rezervacija termina. Apr 10: Izvedba generalnega čiščenja.',
    },
  ];

  const mockAttachments = {
    invoices: [
      {
        id: 'a-i1',
        date: '22. 07. 2026',
        project: 'Montaža toplotne črpalke - KID d.o.o.',
        name: 'racun_4992_2026.pdf',
        aiDetails:
          'Znesek: 4.890 EUR · Kupec: KID d.o.o. · Valuta plačila: 15 dni · Davčna št.: SI29938812',
      },
      {
        id: 'a-i2',
        date: '10. 07. 2026',
        project: 'Sanacija odtoka - Ana Novak',
        name: 'racun_storitve_novak.pdf',
        aiDetails:
          'Znesek: 180 EUR · Kupec: Ana Novak · Gotovinsko plačilo · Material: fi 32 cevi, tesnila',
      },
    ],
    documents: [
      {
        id: 'a-d1',
        date: '18. 07. 2026',
        project: 'Generalno čiščenje - Hotel ABX',
        name: 'skica_prostora_3_nadstropje.pdf',
        aiDetails:
          'Skica tlorisa 3. nadstropja · Površina: 450m2 · Označena okna na severni fasadi',
      },
      {
        id: 'a-d2',
        date: '22. 07. 2026',
        project: 'Montaža toplotne črpalke - KID d.o.o.',
        name: 'navodila_panasonic_heatex.pdf',
        aiDetails:
          'Tehnična specifikacija toplotne črpalke Panasonic 9kW · Shema električnih priklopov',
      },
    ],
    photos: [
      {
        id: 'a-p1',
        date: '23. 07. 2026',
        project: 'Čiščenje steklenih površin',
        name: 'pred_in_po_okno_skladisce.jpg',
        aiDetails:
          'Slika okna v skladišču · Status: Pred čiščenjem · Opomba čistilke: Okno težko dostopno zaradi zložene robe',
      },
      {
        id: 'a-p2',
        date: '21. 07. 2026',
        project: 'Mesečno urejanje - Vila Blok',
        name: 'ziva_meja_dokoncano.jpg',
        aiDetails:
          'Slika žive meje ob cesti · Status: Po končanem delu · Obrezano na višino 1.8m',
      },
    ],
  };

  const mockOfficeNotes = [
    {
      id: 'n-1',
      date: '23. 07. 2026 v 14:15',
      who: 'Tajnica Marija',
      type: 'Telefonat s stranko',
      content:
        'Stranka KID d.o.o. kliče glede statusa računa za toplotno črpalko. Sporočila, da bo nakazilo izvedeno v petek.',
      reminders: 'Preveri prejem nakazila v ponedeljek zjutraj',
    },
    {
      id: 'n-2',
      date: '22. 07. 2026 v 09:30',
      who: 'Direktor Marko',
      type: 'Navodilo za ekipo',
      content:
        'Janez bo danes zamujal 30 minut na lokacijo zaradi zastoja na obvoznici. Poklical je stranko in se opravičil.',
      reminders: 'Ni opomnikov',
    },
    {
      id: 'n-3',
      date: '21. 07. 2026 v 11:05',
      who: 'Vodja del Janez',
      type: 'Material na terenu',
      content:
        'Naročen dodaten material pri vulkanizerstvu za nujno delo na odtoku. Prevzel bo Alen med potjo.',
      reminders: 'Javi Alenu lokacijo prevzema materiala',
    },
    {
      id: 'n-4',
      date: '20. 07. 2026 v 16:45',
      who: 'Tajnica Marija',
      type: 'Reklamacija',
      content:
        'Stranka Vila Blok javlja, da živa meja ob vogalu ni bila popolnoma poravnana. Potreben kratek popravek.',
      reminders: 'Maks naj popravi vogal ob naslednjem obisku',
    },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f5f8] text-slate-400 text-sm">
        {t('officeLoading')}
      </div>
    );
  }

  // Filter Helper
  const matchesSearch = (text: string) => {
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const filteredStaff = staffList.filter(
    (s) =>
      matchesSearch(s.full_name) ||
      matchesSearch(s.email) ||
      matchesSearch(s.role) ||
      matchesSearch(s.phone ?? ''),
  );

  const filteredJobs = mockJobs.filter(
    (j) =>
      matchesSearch(j.project) ||
      matchesSearch(j.worker) ||
      matchesSearch(j.date) ||
      matchesSearch(j.status),
  );

  const filteredCustomers = mockCustomers.filter(
    (c) =>
      matchesSearch(c.name) ||
      matchesSearch(c.project) ||
      matchesSearch(c.notes) ||
      matchesSearch(c.reminders),
  );

  const filteredInvoices = mockAttachments.invoices.filter(
    (a) =>
      matchesSearch(a.name) ||
      matchesSearch(a.project) ||
      matchesSearch(a.aiDetails) ||
      matchesSearch(a.date),
  );

  const filteredDocuments = mockAttachments.documents.filter(
    (a) =>
      matchesSearch(a.name) ||
      matchesSearch(a.project) ||
      matchesSearch(a.aiDetails) ||
      matchesSearch(a.date),
  );

  const filteredPhotos = mockAttachments.photos.filter(
    (a) =>
      matchesSearch(a.name) ||
      matchesSearch(a.project) ||
      matchesSearch(a.aiDetails) ||
      matchesSearch(a.date),
  );

  const filteredNotes = mockOfficeNotes.filter(
    (n) =>
      matchesSearch(n.who) ||
      matchesSearch(n.type) ||
      matchesSearch(n.content) ||
      matchesSearch(n.reminders) ||
      matchesSearch(n.date),
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-blue-500/10 selection:text-blue-600">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-sm h-16 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <Logo className="h-7 w-auto" />
          <span className="h-4 w-px bg-slate-200" />
          <span className="text-xs font-semibold text-slate-600 capitalize">
            {company?.name || 'Baza Podatkov'}
          </span>
          <Badge
            variant="secondary"
            className="bg-blue-50 text-blue-700 hover:bg-blue-50 font-medium text-[11px] border border-blue-100"
          >
            Podatkovni center
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/office')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Nazaj na Dashboard
          </button>

          <div className="h-4 w-px bg-slate-200" />

          <button
            onClick={logout}
            title="Odjava"
            className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* CONTAINER */}
      <div className="max-w-[1400px] mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
        {/* SIDEBAR TABS */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Tabele podatkov
          </h2>

          <button
            onClick={() => {
              setActiveTab(0);
              setSearchQuery('');
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 0
                ? 'bg-[#1D4ED8] text-white shadow-md shadow-blue-500/10'
                : 'bg-white border border-slate-200/60 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="h-4.5 w-4.5" />
              <span>Zaposleni (Staff)</span>
            </div>
            <ChevronRight
              className={`h-4 w-4 opacity-60 ${activeTab === 0 ? 'text-white' : 'text-slate-400'}`}
            />
          </button>

          <button
            onClick={() => {
              setActiveTab(1);
              setSearchQuery('');
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 1
                ? 'bg-[#1D4ED8] text-white shadow-md shadow-blue-500/10'
                : 'bg-white border border-slate-200/60 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Briefcase className="h-4.5 w-4.5" />
              <span>Opravila (Jobs)</span>
            </div>
            <ChevronRight
              className={`h-4 w-4 opacity-60 ${activeTab === 1 ? 'text-white' : 'text-slate-400'}`}
            />
          </button>

          <button
            onClick={() => {
              setActiveTab(2);
              setSearchQuery('');
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 2
                ? 'bg-[#1D4ED8] text-white shadow-md shadow-blue-500/10'
                : 'bg-white border border-slate-200/60 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4.5 w-4.5" />
              <span>Stranke (Customers)</span>
            </div>
            <ChevronRight
              className={`h-4 w-4 opacity-60 ${activeTab === 2 ? 'text-white' : 'text-slate-400'}`}
            />
          </button>

          <button
            onClick={() => {
              setActiveTab(3);
              setSearchQuery('');
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 3
                ? 'bg-[#1D4ED8] text-white shadow-md shadow-blue-500/10'
                : 'bg-white border border-slate-200/60 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Paperclip className="h-4.5 w-4.5" />
              <span>Priponke (Attachments)</span>
            </div>
            <ChevronRight
              className={`h-4 w-4 opacity-60 ${activeTab === 3 ? 'text-white' : 'text-slate-400'}`}
            />
          </button>

          <button
            onClick={() => {
              setActiveTab(4);
              setSearchQuery('');
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 4
                ? 'bg-[#1D4ED8] text-white shadow-md shadow-blue-500/10'
                : 'bg-white border border-slate-200/60 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <StickyNote className="h-4.5 w-4.5" />
              <span>Pisarna (Office Notes)</span>
            </div>
            <ChevronRight
              className={`h-4 w-4 opacity-60 ${activeTab === 4 ? 'text-white' : 'text-slate-400'}`}
            />
          </button>
        </aside>

        {/* MAIN VIEWPORT */}
        <main className="flex-1 flex flex-col gap-6">
          {/* SEARCH & FILTERS HEADER */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Išči po vseh stolpcih..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Filter className="h-3.5 w-3.5" />
                <span>Najdeno: </span>
                <span className="font-bold text-slate-800">
                  {activeTab === 0 && filteredStaff.length}
                  {activeTab === 1 && filteredJobs.length}
                  {activeTab === 2 && filteredCustomers.length}
                  {activeTab === 3 &&
                    (attachmentSubTab === 0
                      ? filteredInvoices.length
                      : attachmentSubTab === 1
                        ? filteredDocuments.length
                        : filteredPhotos.length)}
                  {activeTab === 4 && filteredNotes.length}
                </span>
              </div>
            </div>
          </div>

          {/* TABLE SHEETS */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm flex-1">
            {/* 1. STAFF (ZAPOSLENI) - LIVE DATA */}
            {activeTab === 0 && (
              <div>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">
                      Zaposleni (Staff)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Seznam vseh registriranih uporabnikov v vašem podjetju.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="px-6 py-3.5">Ime in priimek</th>
                        <th className="px-6 py-3.5">Vloga (Role)</th>
                        <th className="px-6 py-3.5">Datum dodajanja</th>
                        <th className="px-6 py-3.5">Telefon</th>
                        <th className="px-6 py-3.5">E-pošta</th>
                        <th className="px-6 py-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staffLoading ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-12 text-center text-slate-400 font-light"
                          >
                            Nalaganje podatkov zaposlenih...
                          </td>
                        </tr>
                      ) : filteredStaff.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-12 text-center text-slate-400 font-light"
                          >
                            Ni najdenih zaposlenih z iskalnim nizom "
                            {searchQuery}".
                          </td>
                        </tr>
                      ) : (
                        filteredStaff.map((member) => (
                          <tr
                            key={member.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1D4ED8] flex items-center justify-center font-bold text-xs border border-blue-100">
                                  {member.full_name.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="font-semibold text-slate-900">
                                  {member.full_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                variant="outline"
                                className={`capitalize text-[10px] px-2 py-0.5 rounded-full ${
                                  member.role === 'owner'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                    : member.role === 'manager'
                                      ? 'bg-sky-50 text-sky-700 border-sky-100'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {member.role === 'owner'
                                  ? 'Lastnik'
                                  : member.role === 'manager'
                                    ? 'Vodja'
                                    : 'Terenski delavec'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                              {new Date(member.created_at).toLocaleDateString(
                                'sl-SI',
                                {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                },
                              )}
                            </td>
                            <td className="px-6 py-4 text-slate-600 font-mono">
                              {member.phone || '—'}
                            </td>
                            <td className="px-6 py-4 text-slate-600 font-mono">
                              {member.email}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${member.is_active ? 'bg-green-500' : 'bg-slate-400'}`}
                                />
                                <span
                                  className={
                                    member.is_active
                                      ? 'text-green-700 font-medium'
                                      : 'text-slate-400'
                                  }
                                >
                                  {member.is_active ? 'Aktiven' : 'Neaktiven'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. TASKS / JOBS (OPRAVILA) */}
            {activeTab === 1 && (
              <div>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">
                      Opravila (Tasks / Jobs)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Pregled opravljenih in aktivnih del na terenu.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="px-6 py-3.5">Datum</th>
                        <th className="px-6 py-3.5">Naziv projekta (Naloga)</th>
                        <th className="px-6 py-3.5">Zaposleni delavec</th>
                        <th className="px-6 py-3.5">Priponke (Attachments)</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">
                          Več informacij
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredJobs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-12 text-center text-slate-400 font-light"
                          >
                            Ni najdenih opravil.
                          </td>
                        </tr>
                      ) : (
                        filteredJobs.map((job) => (
                          <tr
                            key={job.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-6 py-4 text-slate-500 font-mono">
                              {job.date}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-900">
                              {job.project}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {job.worker}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                {job.attachments.length === 0 ? (
                                  <span className="text-slate-400 text-[11px]">
                                    —
                                  </span>
                                ) : (
                                  job.attachments.map((file, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() =>
                                        alert(`Odpira se datoteka: ${file}`)
                                      }
                                      className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline text-left cursor-pointer"
                                    >
                                      <Paperclip className="h-3 w-3 shrink-0" />
                                      <span className="truncate max-w-[150px]">
                                        {file}
                                      </span>
                                    </button>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-2 py-0.5 rounded-full ${
                                  job.status === 'completed'
                                    ? 'bg-green-50 text-green-700 border-green-100'
                                    : job.status === 'v_teku'
                                      ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                                      : 'bg-red-50 text-red-700 border-red-100'
                                }`}
                              >
                                {job.status === 'completed'
                                  ? 'Dokončano'
                                  : job.status === 'v_teku'
                                    ? 'V teku'
                                    : 'Prekinjeno'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() =>
                                  alert(
                                    `Odpira se kartica delovnega naloga za: ${job.project}`,
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                              >
                                Prikaži kartico
                                <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. CUSTOMERS (STRANKE) */}
            {activeTab === 2 && (
              <div>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">
                      Stranke (Customers)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Zgodovina interakcij, zapiski in načrtovani opomniki po
                      posameznih strankah.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="px-6 py-3.5">Naziv stranke</th>
                        <th className="px-6 py-3.5">Datum začetka</th>
                        <th className="px-6 py-3.5">Projekt</th>
                        <th className="px-6 py-3.5">Shranjen zapisek</th>
                        <th className="px-6 py-3.5">Načrtovani opomniki</th>
                        <th className="px-6 py-3.5">Časovnica (Timeline)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCustomers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-12 text-center text-slate-400 font-light"
                          >
                            Ni najdenih strank.
                          </td>
                        </tr>
                      ) : (
                        filteredCustomers.map((cust) => (
                          <tr
                            key={cust.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-6 py-4 font-semibold text-slate-900">
                              {cust.name}
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-mono">
                              {cust.date}
                            </td>
                            <td className="px-6 py-4 text-slate-600 font-medium">
                              {cust.project}
                            </td>
                            <td
                              className="px-6 py-4 text-slate-600 max-w-[200px] truncate"
                              title={cust.notes}
                            >
                              {cust.notes}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              <div className="flex items-center gap-1 text-[11px]">
                                {cust.reminders !==
                                'Ni načrtovanih opomnikov' ? (
                                  <>
                                    <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                    <span className="text-amber-700 font-medium">
                                      {cust.reminders}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </div>
                            </td>
                            <td
                              className="px-6 py-4 text-slate-500 max-w-[250px] truncate"
                              title={cust.timeline}
                            >
                              {cust.timeline}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. ATTACHMENTS (PRIPONKE - SUB-TABS) */}
            {activeTab === 3 && (
              <div>
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">
                      Priponke (Attachments)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Vse datoteke, računi in fotografije s terena z AI analizo
                      vsebine.
                    </p>
                  </div>

                  {/* Sub-Tabs Selector */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
                    <button
                      onClick={() => setAttachmentSubTab(0)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        attachmentSubTab === 0
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Računi (Invoices)
                    </button>
                    <button
                      onClick={() => setAttachmentSubTab(1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        attachmentSubTab === 1
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Ostali dokumenti
                    </button>
                    <button
                      onClick={() => setAttachmentSubTab(2)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        attachmentSubTab === 2
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Fotografije (Photos)
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="px-6 py-3.5">Datum</th>
                        <th className="px-6 py-3.5">Projekt</th>
                        <th className="px-6 py-3.5">Naziv datoteke</th>
                        <th className="px-6 py-3.5">
                          AI Ekstrakcija podrobnosti
                        </th>
                        <th className="px-6 py-3.5 text-right">
                          Odpri priponko
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Sub tab rendering */}
                      {attachmentSubTab === 0 &&
                        (filteredInvoices.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-6 py-12 text-center text-slate-400 font-light"
                            >
                              Ni najdenih računov.
                            </td>
                          </tr>
                        ) : (
                          filteredInvoices.map((inv) => (
                            <tr
                              key={inv.id}
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <td className="px-6 py-4 text-slate-500 font-mono">
                                {inv.date}
                              </td>
                              <td className="px-6 py-4 font-semibold text-slate-800">
                                {inv.project}
                              </td>
                              <td className="px-6 py-4 font-medium text-[#1D4ED8]">
                                {inv.name}
                              </td>
                              <td className="px-6 py-4 text-slate-600 font-light">
                                {inv.aiDetails}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() =>
                                    alert(`Odpira se račun: ${inv.name}`)
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
                                >
                                  <Download className="h-3 w-3" /> Odpri
                                </button>
                              </td>
                            </tr>
                          ))
                        ))}

                      {attachmentSubTab === 1 &&
                        (filteredDocuments.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-6 py-12 text-center text-slate-400 font-light"
                            >
                              Ni najdenih dokumentov.
                            </td>
                          </tr>
                        ) : (
                          filteredDocuments.map((doc) => (
                            <tr
                              key={doc.id}
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <td className="px-6 py-4 text-slate-500 font-mono">
                                {doc.date}
                              </td>
                              <td className="px-6 py-4 font-semibold text-slate-800">
                                {doc.project}
                              </td>
                              <td className="px-6 py-4 font-medium text-[#1D4ED8]">
                                {doc.name}
                              </td>
                              <td className="px-6 py-4 text-slate-600 font-light">
                                {doc.aiDetails}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() =>
                                    alert(`Odpira se dokument: ${doc.name}`)
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
                                >
                                  <Download className="h-3 w-3" /> Odpri
                                </button>
                              </td>
                            </tr>
                          ))
                        ))}

                      {attachmentSubTab === 2 &&
                        (filteredPhotos.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-6 py-12 text-center text-slate-400 font-light"
                            >
                              Ni najdenih fotografij.
                            </td>
                          </tr>
                        ) : (
                          filteredPhotos.map((photo) => (
                            <tr
                              key={photo.id}
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <td className="px-6 py-4 text-slate-500 font-mono">
                                {photo.date}
                              </td>
                              <td className="px-6 py-4 font-semibold text-slate-800">
                                {photo.project}
                              </td>
                              <td className="px-6 py-4 font-medium text-[#1D4ED8]">
                                {photo.name}
                              </td>
                              <td className="px-6 py-4 text-slate-600 font-light">
                                {photo.aiDetails}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() =>
                                    alert(`Prikazuje se slika: ${photo.name}`)
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
                                >
                                  <ExternalLink className="h-3 w-3" /> Prikaži
                                </button>
                              </td>
                            </tr>
                          ))
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. OFFICE NOTES (PISARNA) */}
            {activeTab === 4 && (
              <div>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">
                      Pisarniški Zapiski (Office Notes)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Zgodovina vseh ročno dodanih opomnikov in zapiskov znotraj
                      pisarne.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/60 font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="px-6 py-3.5">Datum</th>
                        <th className="px-6 py-3.5">Avtor (Kdo je objavil)</th>
                        <th className="px-6 py-3.5">Tip zaznamka</th>
                        <th className="px-6 py-3.5">Zapisana opomba</th>
                        <th className="px-6 py-3.5">Načrtovani opomnik</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredNotes.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-12 text-center text-slate-400 font-light"
                          >
                            Ni najdenih zapiskov.
                          </td>
                        </tr>
                      ) : (
                        filteredNotes.map((note) => (
                          <tr
                            key={note.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-6 py-4 text-slate-500 font-mono">
                              {note.date}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-900">
                              {note.who}
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                variant="secondary"
                                className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] rounded-md px-1.5 py-0.5"
                              >
                                {note.type}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-slate-700 leading-relaxed font-light max-w-[300px]">
                              {note.content}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              <div className="flex items-center gap-1 text-[11px]">
                                {note.reminders !== 'Ni opomnikov' ? (
                                  <>
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                    <span className="text-amber-700 font-medium">
                                      {note.reminders}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
