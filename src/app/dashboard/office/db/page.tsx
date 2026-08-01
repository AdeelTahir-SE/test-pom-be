'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/lib/useLanguage';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { api } from '@/lib/api-client';
import {
  Columns3,
  Folder,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Paperclip,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AddTaskModal } from '@/components/dashboard/AddTaskModal';
import { TeamManagementModal } from '@/components/dashboard/TeamManagementModal';
import { AddWorkerCard } from '@/components/dashboard/AddWorkerCard';
import { AuraPhoneInput } from '@/components/dashboard/PhoneInput';

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
  const { user, company, officeContact, loading: authLoading, logout } = useCurrentUser();
  useEffect(() => {
    if (!authLoading && user && user.role === 'worker') {
      router.replace('/dashboard/worker');
    }
  }, [authLoading, user, router]);
  // Active Main Tab: 0 = Zaposleni, 1 = Dela, 2 = Stranke, 3 = Priponke, 4 = Pisarna, 5 = Podatki podjetja
  const [activeTab, setActiveTab] = useState(0);

  // Live Staff Data
  const [staffList, setStaffList] = useState<TeamUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);

  // Modals state
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  // Attachment Sub-Tabs: 0 = Vse, 1 = Računi, 2 = Dokumenti, 3 = Slike
  const [attachmentSubTab, setAttachmentSubTab] = useState(0);

  // Search Queries state (for Zaposleni = 0, Stranke = 2, Pisarna = 4)
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({
    0: '',
    2: '',
    4: '',
  });

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // User Deactivation State
  const [userToDelete, setUserToDelete] = useState<TeamUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Phone state for company profile
  const [companyPhone, setCompanyPhone] = useState(officeContact?.phone || user?.phone || '');

  // Format Date helper to match DD.MM.YY (e.g. 24.07.26)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      const clean = dateStr.replace(/\s+/g, '');
      const parts = clean.split('.');
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2].slice(-2);
        return `${day}.${month}.${year}`;
      }
      return dateStr;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
  };

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

  // Reset pagination & set default sorts when switching tabs
  useEffect(() => {
    setCurrentPage(1);
    if (activeTab === 0) {
      setSortField('created_at');
      setSortOrder('desc');
    } else if (activeTab === 1) {
      setSortField('date');
      setSortOrder('desc');
    } else if (activeTab === 2) {
      setSortField('date');
      setSortOrder('desc');
    } else if (activeTab === 3) {
      setSortField('date');
      setSortOrder('desc');
    } else if (activeTab === 4) {
      setSortField('date');
      setSortOrder('desc');
    }
  }, [activeTab]);

  // Precise Mock Data matching the Slovenian/English screenshot details
  const mockJobs = [
    {
      id: 'j-1',
      date: '2026-07-24',
      customer: 'Company XY',
      project: 'Prenova kopalnice',
      worker: 'Adam K.',
      attachments: ['scan003.jpg', 'contract.doc', 'photo01.jpg'],
      notes: 'Ključ je na recepciji. Parkiraj za hišo.',
    },
    {
      id: 'j-2',
      date: '2026-07-24',
      customer: 'Frank Bird',
      project: 'Dostava na dom',
      worker: 'Jack',
      attachments: [],
      notes: '',
    },
    {
      id: 'j-3',
      date: '2026-07-24',
      customer: 'Alessia V.',
      project: 'Transport Ljubljana - Muenchen',
      worker: 'Slippy Joe',
      attachments: ['Cargo list'],
      notes: 'Preveri dovoljenja za mednarodni transport.',
    },
  ];

  const mockCustomers = [
    {
      id: 'c-1',
      date: '2026-07-24',
      name: 'Company XY',
      project: 'Prenova kopalnice',
      notes: 'Ključ je na recepciji. Parkiraj za hišo in vedno koristi stranski vhod. Alarm je 3810',
      reminders: ['24.07.2026', '31.07.2026', '04.10.2026'],
      timeline: ['24.07.2026', '31.07.2026', '04.10.2026'],
    },
    {
      id: 'c-2',
      date: '2026-07-24',
      name: 'Pizzeria Rose',
      project: 'Dostava na dom',
      notes: '',
      reminders: ['24.07.2026'],
      timeline: ['24.07.2026', '31.07.2026', '04.10.2026'],
    },
    {
      id: 'c-3',
      date: '2026-07-24',
      name: 'Pizzeria Rose',
      project: 'Transport Ljubljana - Muenchen',
      notes: 'Suho čiščenje v sobi 202. Receptor podpiše',
      reminders: [],
      timeline: ['24.07.2026', '31.07.2026', '04.10.2026'],
    },
  ];

  const mockAttachments = {
    invoices: [
      {
        id: 'a-i1',
        jobId: 'job-1',
        date: '2026-07-24',
        project: 'Prenova kopalnice',
        name: 'racun_001.pdf',
        aiDetails: 'Hotel ABX d.o.o.\n684,20€\n12.06.2026',
      },
      {
        id: 'a-i2',
        jobId: 'job-2',
        date: '2026-07-24',
        project: 'Dostava na dom',
        name: 'racun_002.pdf',
        aiDetails: 'Servisni zapisnik\nHotel ABG\nServis klimatske naprave\nOpravil: Marko',
      },
      {
        id: 'a-i3',
        jobId: 'job-3',
        date: '2026-07-24',
        project: 'Transport Ljubljana - Muenchen',
        name: 'racun_003.pdf',
        aiDetails: 'Cargo list\n24t pšenice\n12.06.2026',
      },
    ],
    documents: [
      {
        id: 'a-d1',
        jobId: 'job-1',
        date: '2026-07-24',
        project: 'Prenova kopalnice',
        name: 'pogodba.pdf',
        aiDetails: 'Pogodba št. 123/2026\nPrenova kopalnice\nPlačano',
      },
      {
        id: 'a-d2',
        jobId: 'job-2',
        date: '2026-07-24',
        project: 'Dostava na dom',
        name: 'navodila.pdf',
        aiDetails: 'Navodila za dostavo\nPodrobnosti o pakiranju',
      },
    ],
    photos: [
      {
        id: 'a-p1',
        jobId: 'job-1',
        date: '2026-07-24',
        project: 'Prenova kopalnice',
        name: 'slika_001.jpg',
        aiDetails: 'Predelava stene\nVgradnja novih oken',
      },
    ],
  };

  const mockOfficeNotes = [
    {
      id: 'n-1',
      date: '2026-07-24',
      who: 'Alessia',
      project: 'Kosilo s Kristino',
      content: 'Some notes here whatever they wrote.',
      time: '13:00',
    },
    {
      id: 'n-2',
      date: '2026-07-24',
      who: 'Alex P.',
      project: 'Dostava na dom',
      content: '',
      time: '15:00',
    },
    {
      id: 'n-3',
      date: '2026-07-24',
      who: 'Adam Bird',
      project: 'Transport Ljubljana - Muenchen',
      content: 'Pokliči Petra',
      time: '15:15',
    },
  ];

  // Helper sorting function
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const getSortedData = (data: any[]) => {
    return [...data].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';

      if (typeof valA === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });
  };

  // Staff list filtering & sorting
  const getFilteredStaff = () => {
    let result = [...staffList].filter((s) => s.is_active);
    const query = searchQueries[0]?.toLowerCase() || '';

    if (query) {
      result = result.filter(
        (s) =>
          s.full_name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          (s.phone && s.phone.includes(query))
      );
    }

    return getSortedData(result);
  };

  // Jobs filtering & sorting
  const getFilteredJobs = () => {
    let result = [...mockJobs];
    return getSortedData(result);
  };

  // Customers filtering & sorting
  const getFilteredCustomers = () => {
    let result = [...mockCustomers];
    const query = searchQueries[2]?.toLowerCase() || '';

    if (query) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.project.toLowerCase().includes(query) ||
          c.notes.toLowerCase().includes(query)
      );
    }

    return getSortedData(result);
  };

  // Attachments filtering & sorting
  const getFilteredAttachments = () => {
    let result =
      attachmentSubTab === 0
        ? [...mockAttachments.invoices, ...mockAttachments.documents, ...mockAttachments.photos]
        : attachmentSubTab === 1
          ? mockAttachments.invoices
          : attachmentSubTab === 2
            ? mockAttachments.documents
            : mockAttachments.photos;

    return getSortedData(result);
  };

  // Notes filtering & sorting
  const getFilteredNotes = () => {
    let result = [...mockOfficeNotes];
    const query = searchQueries[4]?.toLowerCase() || '';

    if (query) {
      result = result.filter(
        (n) =>
          n.who.toLowerCase().includes(query) ||
          n.content.toLowerCase().includes(query) ||
          n.project.toLowerCase().includes(query)
      );
    }

    return getSortedData(result);
  };

  // Select filtered items based on current active tab
  const getActiveDataset = () => {
    switch (activeTab) {
      case 0:
        return getFilteredStaff();
      case 1:
        return getFilteredJobs();
      case 2:
        return getFilteredCustomers();
      case 3:
        return getFilteredAttachments();
      case 4:
        return getFilteredNotes();
      default:
        return [];
    }
  };

  const activeDataset = getActiveDataset();
  const totalPages = Math.max(1, Math.ceil(activeDataset.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedDataset = activeDataset.slice(startIndex, startIndex + rowsPerPage);

  // Soft delete Staff member (sets is_active to false, hides from list but keeps all data)
  const handleDeactivateStaff = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      const res = await api.patch(`/api/users/${userToDelete.id}`, {
        is_active: false,
      });
      if (res.status === 200) {
        await loadStaff();
        setUserToDelete(null);
      } else {
        alert(res.error?.message || 'Napaka pri brisanju sodelavca.');
      }
    } catch (err) {
      console.error(err);
      alert('Težava pri povezavi z strežnikom.');
    } finally {
      setDeletingUser(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-400 text-sm">
        {t('officeLoading')}
      </div>
    );
  }

  // Common Header Cell helper with sort indicator to the left
  const renderHeaderCell = (
    label: string,
    field?: string,
    sortable = true
  ) => {
    const isSorted = field && sortField === field;
    return (
      <th
        className="px-6 py-4 relative select-none"
        style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          fontSize: '14px',
          lineHeight: '18px',
          color: '#575F6E',
        }}
      >
        <div
          onClick={() => sortable && field && handleSort(field)}
          className={`flex items-center gap-1.5 ${
            sortable && field ? 'cursor-pointer select-none hover:text-slate-800' : ''
          }`}
        >
          <span>{label}</span>

          {sortable && (
            <span
              className={`text-[10px] ml-1 transition-colors ${
                isSorted ? 'text-blue-600 font-bold' : 'text-slate-400'
              }`}
            >
              {isSorted && sortOrder === 'asc' ? '▲' : '▼'}
            </span>
          )}
        </div>
      </th>
    );
  };

  const tdStyle14 = {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: '14px',
    lineHeight: '24px',
    verticalAlign: 'middle',
  };

  const tdStyle12 = {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: '12px',
    lineHeight: '24px',
    verticalAlign: 'middle',
  };

  const tdStyle10 = {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
    fontSize: '10px',
    lineHeight: '24px',
    verticalAlign: 'middle',
    color: '#24273166',
  };

  return (
    <div
      className="min-h-screen bg-[#f3f5f8] flex text-slate-800 font-sans selection:bg-blue-500/10 selection:text-blue-600"
    >
      {/* LEFT SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 shrink-0 flex flex-col justify-between py-6 px-4">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="px-3 flex items-center gap-2">
            <Logo className="h-6 w-auto" />
          </div>

          {/* User account / Pill Button (8px Border Radius) */}
          <div className="px-3">
            <Link
              href="/dashboard/office"
              className="w-full block bg-indigo-600 hover:bg-indigo-700 text-white rounded-[8px] text-xs font-semibold py-2.5 px-4 text-center shadow-sm transition-colors cursor-pointer"
            >
              UPORABNIŠKI RAČUN
            </Link>
          </div>

          {/* Sidebar Tabs (8px Border Radius) */}
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setActiveTab(0)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-xs font-medium transition-all cursor-pointer text-left w-full ${
                activeTab === 0
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Columns3 className="h-4.5 w-4.5 shrink-0 text-slate-500" />
              <span className='font-inter font-medium text-base leading-6 align-middle'>Zaposleni</span>
            </button>

            <button
              onClick={() => setActiveTab(1)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-xs font-medium transition-all cursor-pointer text-left w-full ${
                activeTab === 1
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Folder className="h-4.5 w-4.5 shrink-0 text-slate-500" />
              <span className='font-inter font-medium text-base leading-6 align-middle'>Dela</span>
            </button>

            <button
              onClick={() => setActiveTab(2)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-xs font-medium transition-all cursor-pointer text-left w-full ${
                activeTab === 2
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Folder className="h-4.5 w-4.5 shrink-0 text-slate-500" />
              <span className='font-inter font-medium text-base leading-6 align-middle'>Naročniki</span>
            </button>

            <button
              onClick={() => setActiveTab(3)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-xs font-medium transition-all cursor-pointer text-left w-full ${
                activeTab === 3
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Folder className="h-4.5 w-4.5 shrink-0 text-slate-500" />
              <span className='font-inter font-medium text-base leading-6 align-middle'>Priponke</span>
            </button>

            <button
              onClick={() => setActiveTab(4)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-xs font-medium transition-all cursor-pointer text-left w-full ${
                activeTab === 4
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Folder className="h-4.5 w-4.5 shrink-0 text-slate-500" />
              <span className='font-inter font-medium text-base leading-6 align-middle'>Pisarna</span>
            </button>

            {/* Separator */}
            <div className="h-px bg-slate-200/60 my-2" />

            {/* Outer Actions/Redirections (8px Border Radius) */}
            <button
              onClick={() => setActiveTab(5)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-xs font-medium transition-all cursor-pointer text-left w-full ${
                activeTab === 5
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Folder className="h-4.5 w-4.5 shrink-0 text-slate-500" />
              <span className='font-inter font-medium text-base leading-6 align-middle'>Podatki podjetja</span>
            </button>

            <button
              onClick={() => setIsTeamOpen(true)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer text-left w-full"
            >
              <Folder className="h-4.5 w-4.5 shrink-0 text-slate-500" />
              <span className='font-inter font-medium text-base leading-6 align-middle'>Dodaj sodelavca</span>
            </button>

            <button
              onClick={() => setIsAddTaskOpen(true)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer text-left w-full"
            >
              <Folder className="h-4.5 w-4.5 shrink-0 text-slate-500" />
              <span className='font-inter font-medium text-base leading-6 align-middle'>Terenska kartica</span>
            </button>

            <a
              href="https://buy.stripe.com/test"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer w-full"
            >
              <Folder className="h-4.5 w-4.5 shrink-0 text-slate-500" />
              <span className='font-inter font-medium text-base leading-6 align-middle'>Naročilo</span>
            </a>
          </nav>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* TOP HEADER */}
        <header className="h-14 bg-transparent flex items-center justify-end px-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-900">{user?.full_name}</span>
              <span className="text-[10px] text-slate-400 font-mono">{user?.email}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold text-xs">
              {user ? user.full_name.slice(0, 2).toUpperCase() : 'U'}
            </div>
            <button
              onClick={logout}
              title="Odjava"
              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        {/* CONTAINER */}
        <main className="flex-1 px-8 pb-8 pt-[16px] overflow-y-auto">
          {/* Active Tab Title */}
          <h1
            className="mb-[26px] select-none"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '32px',
              lineHeight: '36px',
              color: '#242731',
              verticalAlign: 'middle',
            }}
          >
            {activeTab === 0 && 'Zaposleni'}
            {activeTab === 1 && 'Dela'}
            {activeTab === 2 && 'Stranke'}
            {activeTab === 3 && 'Priponke'}
            {activeTab === 4 && 'Pisarna'}
            {activeTab === 5 && 'Podatki podjetja'}
          </h1>

          {/* Search Bar for Tabs 0, 2, 4 */}
          {(activeTab === 0 || activeTab === 2 || activeTab === 4) && (
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.8333 12.8333L9.5 9.5M10.9167 6.125C10.9167 8.77056 8.77056 10.9167 6.125 10.9167C3.47944 10.9167 1.33333 8.77056 1.33333 6.125C1.33333 3.47944 3.47944 1.33333 6.125 1.33333C8.77056 1.33333 10.9167 3.47944 10.9167 6.125Z" stroke="#8A94A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full bg-transparent border-b border-slate-200/80 focus:border-slate-400 focus:outline-none pl-6 pb-2 text-sm text-[#242731] placeholder-[#8A94A6]"
                  value={searchQueries[activeTab] || ''}
                  onChange={(e) => setSearchQueries({
                    ...searchQueries,
                    [activeTab]: e.target.value
                  })}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                />
              </div>
              <button className="h-9 w-9 border border-slate-200 rounded-[8px] bg-white hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-colors shadow-sm">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.5 3H10.5M3 6H9M4.5 9H7.5" stroke="#242731" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}

          {/* RENDERING ACCORDING TO TAB TYPE */}
          {activeTab === 5 ? (
            /* TAB 5: PODATKI PODJETJA (COMPANY PROFILE) */
            <div className="max-w-2xl mt-8 flex flex-col gap-6" style={{ fontFamily: 'Inter, sans-serif' }}>
               {/* Podjetje row */}
               <div className="flex items-start justify-between py-2 border-b border-slate-100">
                <div className="flex gap-12 items-baseline">
                  <span className="w-32 text-[#8A94A6] text-sm">Podjetje</span>
                  <span className="text-[#242731] text-sm font-medium">{company?.name || 'Nokia d.o.o.'}</span>
                </div>
              </div>

              {/* Panoga row */}
              <div className="flex gap-12 py-2 border-b border-slate-100">
                <span className="w-32 text-[#8A94A6] text-sm">Panoga</span>
                <span className="text-[#242731] text-sm font-medium">{company?.business_module || 'Whatever they write'}</span>
              </div>
              
              {/* Telefon row */}
              <div className="flex gap-12 py-2 border-b border-slate-100">
                <span className="w-32 text-[#8A94A6] text-sm">Telefon</span>
                <div className="flex-1">
                  <AuraPhoneInput
                    value={companyPhone}
                    onChange={setCompanyPhone}
                    placeholder="30 123 456"
                  />
                </div>
              </div>

              {/* E-pošta row */}
              <div className="flex gap-12 py-2 border-b border-slate-100">
                <span className="w-32 text-[#8A94A6] text-sm">E-pošta</span>
                <span className="text-[#242731] text-sm font-medium">{officeContact?.email || user?.email || 'info@bestevercompany.com'}</span>
              </div>

              {/* Geslo row */}
              <div className="flex flex-col gap-2 py-2 border-b border-slate-100">
                <div className="flex gap-12">
                  <span className="w-32 text-[#8A94A6] text-sm">Geslo</span>
                  <span className="text-[#242731] text-sm font-medium">***********</span>
                </div>
                <div className="pl-44">
                  <button onClick={() => alert('Spremeni geslo')} className="text-[#3B82F6] hover:underline text-sm font-medium cursor-pointer">
                    Spremeni geslo
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Main Card Wrapper for Tables (8px Border Radius) */
            <div className="bg-white border border-slate-200 rounded-[8px] shadow-sm overflow-hidden flex flex-col justify-between min-h-[500px]">
              {/* Table Content */}
              <div className="flex-1">
                {/* TAB 0: STAFF (ZAPOSLENI) */}
                {activeTab === 0 && (
                  <div>
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/60">
                            {renderHeaderCell('Ime', 'full_name', true)}
                            {renderHeaderCell('Dostop', undefined, false)}
                            {renderHeaderCell('Dodano', 'created_at', true)}
                            {renderHeaderCell('Telefon', undefined, false)}
                            {renderHeaderCell('E-pošta', undefined, false)}
                            <th className="px-6 py-4 font-normal text-slate-500 text-xs tracking-normal text-right"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {staffLoading ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                Nalaganje podatkov zaposlenih...
                              </td>
                            </tr>
                          ) : paginatedDataset.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                Ni najdenih zaposlenih z izbranimi filtri.
                              </td>
                            </tr>
                          ) : (
                            paginatedDataset.map((member: TeamUser) => (
                              <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-slate-800" style={tdStyle14}>
                                  {member.full_name}
                                </td>
                                <td className="px-6 py-4 text-slate-800" style={tdStyle14}>
                                  {member.role === 'owner'
                                    ? 'Vodja'
                                    : member.role === 'manager'
                                      ? 'Pisarna'
                                      : 'Teren'}
                                </td>
                                <td className="px-6 py-4 text-slate-800" style={tdStyle12}>
                                  {formatDate(member.created_at)}
                                </td>
                                <td className="px-6 py-4 text-slate-800" style={tdStyle12}>
                                  {member.phone || '—'}
                                </td>
                                <td className="px-6 py-4 text-slate-800 font-mono" style={tdStyle12}>
                                  {member.email}
                                </td>
                                <td className="px-6 py-4 text-right" style={tdStyle10}>
                                  {member.role !== 'owner' ? (
                                    <button
                                      onClick={() => setUserToDelete(member)}
                                      className="hover:underline cursor-pointer"
                                      style={{ color: '#24273166' }}
                                    >
                                      Izbriši
                                    </button>
                                  ) : (
                                    <span>—</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 1: DELA (JOBS) */}
                {activeTab === 1 && (
                  <div>
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/60">
                            {renderHeaderCell('Datum', 'date', true)}
                            {renderHeaderCell('Stranka', 'customer', true)}
                            {renderHeaderCell('Dela', undefined, false)}
                            {renderHeaderCell('Zaznamki', undefined, false)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedDataset.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                Ni najdenih opravil.
                              </td>
                            </tr>
                          ) : (
                            paginatedDataset.map((job) => (
                              <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-slate-800 font-mono" style={tdStyle12}>
                                  {formatDate(job.date)}
                                </td>
                                <td className="px-6 py-4 text-slate-800 font-medium" style={tdStyle12}>
                                  {job.customer}
                                </td>
                                <td className="px-6 py-4 text-slate-800" style={tdStyle12}>
                                  <button
                                    onClick={() => router.push(`/dashboard/office?job=${job.id}`)}
                                    className="text-left hover:underline cursor-pointer bg-transparent border-none p-0 outline-none"
                                  >
                                    {job.project}
                                  </button>
                                </td>
                                <td className="px-6 py-4 text-slate-800 max-w-[300px] break-words whitespace-pre-line" style={tdStyle12}>
                                  {job.notes || '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 2: STRANKE (CUSTOMERS) */}
                {activeTab === 2 && (
                  <div>
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/60">
                            {renderHeaderCell('Datum', 'date', true)}
                            {renderHeaderCell('Stranka', 'name', true)}
                            {renderHeaderCell('Dela', undefined, false)}
                            {renderHeaderCell('Zaznamki', undefined, false)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedDataset.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                Ni najdenih strank.
                              </td>
                            </tr>
                          ) : (
                            paginatedDataset.map((cust) => (
                              <tr key={cust.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-slate-800 font-mono" style={tdStyle12}>
                                  {formatDate(cust.date)}
                                </td>
                                <td className="px-6 py-4 text-slate-800 font-medium" style={tdStyle12}>
                                  {cust.name}
                                </td>
                                <td className="px-6 py-4 text-slate-800" style={tdStyle12}>
                                  {cust.project}
                                </td>
                                <td className="px-6 py-4 text-slate-800 max-w-[300px] break-words whitespace-pre-line" style={tdStyle12}>
                                  {cust.notes || '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 3: PRIPONKE (ATTACHMENTS) */}
                {activeTab === 3 && (
                  <div>
                    {/* Category bar matching the exact screenshot visual layout */}
                    <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                      <div className="flex gap-6">
                        {['Vse', 'Računi', 'Dokumenti', 'Slike'].map((sub, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setAttachmentSubTab(idx);
                              setCurrentPage(1);
                            }}
                            className={`pb-1 text-sm font-medium border-b-2 transition-all cursor-pointer ${
                              attachmentSubTab === idx
                                ? 'border-blue-600 text-blue-600 font-semibold'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => alert('Dodaj priponko')}
                        className="text-sm text-slate-400 hover:text-slate-[#242731] cursor-pointer font-medium hover:underline"
                      >
                        Dodaj
                      </button>
                    </div>

                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/60">
                            {renderHeaderCell('Datum', 'date', true)}
                            {renderHeaderCell('Dela', 'project', true)}
                            {renderHeaderCell('ime priponke', undefined, false)}
                            {renderHeaderCell('AI Extract', undefined, false)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedDataset.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                Ni najdenih datotek v tej kategoriji.
                              </td>
                            </tr>
                          ) : (
                            paginatedDataset.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-slate-800 font-mono" style={tdStyle12}>
                                  {formatDate(item.date)}
                                </td>
                                <td className="px-6 py-4 text-slate-800" style={tdStyle12}>
                                  <button
                                    onClick={() => router.push(`/dashboard/office?job=${item.jobId}`)}
                                    className="text-left hover:underline cursor-pointer bg-transparent border-none p-0 outline-none"
                                  >
                                    {item.project}
                                  </button>
                                </td>
                                <td className="px-6 py-4 text-blue-600 font-medium cursor-pointer hover:underline" style={tdStyle12}>
                                  {item.name}
                                </td>
                                <td className="px-6 py-4 text-slate-800 whitespace-pre-line leading-relaxed" style={tdStyle12}>
                                  {item.aiDetails}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
          )}

                {/* TAB 4: OFFICE NOTES (PISARNA) */}
                {activeTab === 4 && (
                  <div>
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/60">
                            {renderHeaderCell('Dodano', 'date', true)}
                            {renderHeaderCell('Kdo', 'who', true)}
                            {renderHeaderCell('Kaj', undefined, false)}
                            {renderHeaderCell('Podrobno', undefined, false)}
                            <th className="px-6 py-4 font-normal text-slate-500 text-xs tracking-normal text-right"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedDataset.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                Ni najdenih zapiskov.
                              </td>
                            </tr>
                          ) : (
                            paginatedDataset.map((note) => (
                              <tr key={note.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-slate-800 font-mono" style={tdStyle12}>
                                  {formatDate(note.date)} | {note.time}
                                </td>
                                <td className="px-6 py-4 text-slate-800" style={tdStyle12}>
                                  {note.who}
                                </td>
                                <td className="px-6 py-4 text-slate-800" style={tdStyle12}>
                                  {note.project}
                                </td>
                                <td className="px-6 py-4 text-slate-800 max-w-[300px]" style={tdStyle12}>
                                  {note.content || '—'}
                                </td>
                                <td className="px-6 py-4 text-right" style={tdStyle10}>
                                  <button
                                    onClick={() => {
                                      const updated = mockOfficeNotes.filter((n) => n.id !== note.id);
                                      // This is a frontend-only soft delete - in real app would call API
                                      console.log('Soft delete note:', note.id);
                                    }}
                                    className="hover:text-red-600 cursor-pointer transition-colors"
                                    style={{ color: '#24273166' }}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M3 6h18" />
                                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                    </svg>
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
              </div>

              {/* PAGINATION FOOTER */}
              <footer className="border-t border-slate-200 bg-slate-50/40 px-6 py-4 flex items-center justify-between shrink-0">
                {/* Rows Per Page */}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Vrstic na stran:</span>
                  <div className="relative">
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="appearance-none bg-slate-50 border border-slate-200 rounded-[8px] pl-3 pr-8 py-1.5 text-xs text-slate-700 font-medium focus:outline-none cursor-pointer hover:bg-slate-100/70"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-3 w-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-[8px] border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
                        currentPage === p
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-[8px] border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </footer>
            </div>
          )}
        </main>
      </div>

      {/* DELETE STAFF CONFIRMATION DIALOG */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent className="max-w-sm w-[90vw] bg-white rounded-[8px] p-6 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">
              Brisanje sodelavca
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-slate-600 my-4 leading-relaxed">
            Ali ste prepričani, da želite izbrisati sodelavca{' '}
            <strong className="text-slate-900">{userToDelete?.full_name}</strong>? Sodelavec ne bo več
            prikazan v seznamu, vendar bodo vsi njegovi podatki (opravila, opombe, zgodovina) ohranjeni.
          </div>
          <DialogFooter className="flex gap-2">
            <button
              onClick={() => setUserToDelete(null)}
              className="flex-1 h-9 rounded-[8px] border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Prekliči
            </button>
            <button
              onClick={handleDeactivateStaff}
              disabled={deletingUser}
              className="flex-1 h-9 rounded-[8px] bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {deletingUser ? 'Brisanje...' : 'Izbriši'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EXISTING DIALOGS CONNECTED TO SIDEBAR CLICKS */}
      <TeamManagementModal
        isOpen={isTeamOpen}
        onOpenChange={setIsTeamOpen}
        currentUserId={user?.id}
        onChanged={loadStaff}
        isOwner={user?.role === 'owner'}
        onAddMember={() => {
          setIsTeamOpen(false);
          setIsAddWorkerOpen(true);
        }}
      />

      <AddWorkerCard
        isOpen={isAddWorkerOpen}
        onOpenChange={setIsAddWorkerOpen}
        onAddWorker={async (w) => {
          try {
            const res = await api.post('/api/users', w);
            if (res.status === 201 || res.status === 200) {
              await loadStaff();
            } else {
              alert(res.error?.message || 'Napaka pri dodajanju sodelavca.');
            }
          } catch (err) {
            console.error(err);
            alert('Težava pri povezavi z strežnikom.');
          }
        }}
      />

      <AddTaskModal
        isOpen={isAddTaskOpen}
        onOpenChange={setIsAddTaskOpen}
        workers={staffList.map((w) => ({ id: w.id, name: w.full_name }))}
        defaultDate={new Date().toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\s+/g, '')}
        onAddTask={async (taskData) => {
          try {
            const res = await api.post('/api/jobs', taskData);
            if (res.status === 201 || res.status === 200) {
              alert('Naloga uspešno dodana.');
            } else {
              alert(res.error?.message || 'Napaka pri ustvarjanju naloge.');
            }
          } catch (err) {
            console.error(err);
            alert('Težava pri povezavi z strežnikom.');
          }
        }}
      />
    </div>
  );
}
