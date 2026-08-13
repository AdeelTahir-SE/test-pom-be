'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/useLanguage';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { api } from '@/lib/api-client';
import { normalizePhone } from '@/lib/phone';
import type { ApiJob, ApiChecklistItem, ApiOfficeReminder, ApiUser } from '@/lib/dashboardMappers';
import { jobNumber, jobToWorkerCard } from '@/lib/dashboardMappers';
import type { Worker } from '@/lib/mockData';
import { isJobCardMutable } from '@/lib/officeDate';
import { dbAttachmentCategory, type DbAttachmentCategory } from '@/lib/dbAttachmentCategory';
import {
  jobAttachmentErrorMessage,
  validateJobAttachmentFile,
} from '@/lib/uploadValidation';
import {
  Columns3,
  Folder,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AddTaskModal } from '@/components/dashboard/AddTaskModal';
import { AddWorkerCard } from '@/components/dashboard/AddWorkerCard';
import { WorkerDetailModal } from '@/components/dashboard/WorkerDetailModal';
import { AuraFileInput } from '@/components/dashboard/AuraForm';
import { parseNoteText } from '@/components/dashboard/CustomerNotesBanner';
import { AddCustomerNoteDialog } from '@/components/dashboard/AddCustomerNoteDialog';

interface TeamUser {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'manager' | 'worker';
  phone: string | null;
  is_active: boolean;
  created_at: string;
  login_pin?: string | null;
}

interface DbJobRow {
  id: string;
  date: string;
  customer: string;
  project: string;
  workerId: string | null;
  workerName: string;
}

interface DbAttachmentRow {
  id: string;
  jobId: string;
  date: string;
  project: string;
  name: string;
  aiDetails: string;
  uploadedByName: string;
  category: DbAttachmentCategory;
  signedUrl: string | null;
}

interface DbZaznamekRow {
  customerId: string;
  customerName: string;
  notes: { id: string; note: string }[];
}

interface DbOfficeNoteRow {
  id: string;
  date: string;
  who: string;
  project: string;
  content: string;
  time: string;
}

interface ApiFileRow {
  id: string;
  job_id: string;
  job_title: string | null;
  file_name: string;
  attachment_type: string;
  document_type: string | null;
  document_preview: string | null;
  created_at: string;
  signed_url: string | null;
  uploaded_by?: string | null;
  uploaded_by_name?: string | null;
}

export default function DatabaseDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, company, officeContact, loading: authLoading } = useCurrentUser();
  useEffect(() => {
    if (!authLoading && user && user.role === 'worker') {
      router.replace('/dashboard/worker');
    }
  }, [authLoading, user, router]);
  // Active Main Tab: 0 = Zaposleni, 1 = Dela, 3 = Priponke (+ Zaznamki sub-tab), 4 = Pisarna, 5 = Podatki podjetja
  // (Tab 2 unused — Zaznamki lives under Priponke per Mark.)
  const [activeTab, setActiveTab] = useState(0);

  // Live Staff Data
  const [staffList, setStaffList] = useState<TeamUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [jobsList, setJobsList] = useState<DbJobRow[]>([]);
  /** Full job payloads for opening the existing details popup from Dela / Priponke→Dela (Mark). */
  const [jobsById, setJobsById] = useState<Record<string, ApiJob>>({});
  const [detailJobId, setDetailJobId] = useState<string | null>(null);
  const [isJobDetailOpen, setIsJobDetailOpen] = useState(false);
  const [detailWorkerCard, setDetailWorkerCard] = useState<Worker | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsCustomerFilter, setJobsCustomerFilter] = useState<string | null>(null);
  const [jobsWorkerFilter, setJobsWorkerFilter] = useState<string | null>(null);
  const [attachmentsList, setAttachmentsList] = useState<DbAttachmentRow[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [zaznamkiList, setZaznamkiList] = useState<DbZaznamekRow[]>([]);
  /** All customer names for the shared add-note popup (even if they have no notes yet). */
  const [zaznamkiCustomerOptions, setZaznamkiCustomerOptions] = useState<string[]>([]);
  const [zaznamkiLoading, setZaznamkiLoading] = useState(false);
  const [isAddZaznamekOpen, setIsAddZaznamekOpen] = useState(false);
  const [officeNotes, setOfficeNotes] = useState<DbOfficeNoteRow[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);
  const [previewAttachmentName, setPreviewAttachmentName] = useState<string>('');
  const [dataError, setDataError] = useState<string | null>(null);

  // Modals state
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddAttachmentOpen, setIsAddAttachmentOpen] = useState(false);
  const [attachJobId, setAttachJobId] = useState('');
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachUploading, setAttachUploading] = useState(false);

  // Attachment Sub-Tabs: 0=Vse, 1=Računi, 2=Dokumenti, 3=Slike, 4=Ostalo, 5=Zaznamki
  const [attachmentSubTab, setAttachmentSubTab] = useState(0);

  // Search Queries state (0=Zaposleni, 1=Dela, 2=Zaznamki-in-Priponke, 4=Pisarna)
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({
    0: '',
    1: '',
    2: '',
    4: '',
  });
  const [staffRoleFilter, setStaffRoleFilter] = useState<'all' | 'owner' | 'manager' | 'worker'>('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // User Deactivation State
  const [userToDelete, setUserToDelete] = useState<TeamUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Phone state for company profile (+386 office number → call office)
  const [companyPhone, setCompanyPhone] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);

  /** Show local SI digits in the input; +386 is shown as the fixed prefix. */
  const toLocalSiPhoneDisplay = (stored: string): string => {
    const digits = stored.replace(/\D/g, '');
    if (digits.startsWith('386')) return digits.slice(3);
    return digits;
  };

  /** Persist as +386… so worker “call office” / tel: works. */
  const toStoredSiPhone = (local: string): string | null => {
    const trimmed = local.trim();
    if (!trimmed) return null;
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return null;
    if (trimmed.startsWith('+') || digits.startsWith('386')) {
      return normalizePhone(trimmed.startsWith('+') ? trimmed : `+${digits}`);
    }
    return normalizePhone(`+386${digits}`);
  };

  useEffect(() => {
    setCompanyPhone(toLocalSiPhoneDisplay(user?.phone || ''));
  }, [user?.phone]);

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

  const formatTimeOfDay = (iso: string, remindTime?: string | null) => {
    if (remindTime && /^\d{1,2}:\d{2}/.test(remindTime)) return remindTime.slice(0, 5);
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    setDataError(null);
    try {
      const params = new URLSearchParams();
      if (jobsCustomerFilter) params.set('customer', jobsCustomerFilter);
      if (jobsWorkerFilter) params.set('worker_id', jobsWorkerFilter);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get<{
        jobs: Array<
          ApiJob & { worker_name?: string | null; worker_phone?: string | null }
        >;
      }>(`/api/jobs${qs}`);
      if (res.status !== 200) {
        setDataError(res.error?.message ?? 'Opravil ni bilo mogoče naložiti.');
        setJobsList([]);
        setJobsById({});
        return;
      }
      const jobs = res.data?.jobs ?? [];
      const byId: Record<string, ApiJob> = {};
      for (const j of jobs) byId[j.id] = j;
      setJobsById(byId);
      setJobsList(
        jobs.map((j) => ({
          id: j.id,
          date: j.scheduled_at || j.created_at,
          customer: j.customer?.trim() || '—',
          project: j.title,
          workerId: j.worker_id,
          workerName: j.worker_name?.trim() || '—',
        }))
      );
    } catch (err) {
      console.error(err);
      setDataError('Opravil ni bilo mogoče naložiti.');
    } finally {
      setJobsLoading(false);
    }
  }, [jobsCustomerFilter, jobsWorkerFilter]);

  /** Open existing job details popup on this DB page (Mark — no redirect to board). */
  const openJobDetail = useCallback(
    async (jobId: string) => {
      setDetailJobId(jobId);
      setIsJobDetailOpen(true);

      let job = jobsById[jobId];
      if (!job) {
        try {
          const jobRes = await api.get<{ job: ApiJob }>(`/api/jobs/${jobId}`);
          if (jobRes.status === 200 && jobRes.data?.job) {
            job = jobRes.data.job;
            setJobsById((prev) => ({ ...prev, [jobId]: job! }));
          }
        } catch (err) {
          console.error(err);
        }
      }
      if (!job) {
        setIsJobDetailOpen(false);
        setDetailJobId(null);
        alert('Opravila ni bilo mogoče naložiti.');
        return;
      }

      let checklist: ApiChecklistItem[] = [];
      try {
        const res = await api.get<{ checklist: ApiChecklistItem[] }>(
          `/api/jobs/${jobId}/checklist`
        );
        if (res.status === 200 && res.data?.checklist) {
          checklist = res.data.checklist;
        }
      } catch (err) {
        console.error(err);
      }

      const staff = staffList.find((s) => s.id === job.worker_id);
      const apiWorker: ApiUser | undefined = staff
        ? {
            id: staff.id,
            email: staff.email,
            full_name: staff.full_name,
            role: staff.role,
            phone: staff.phone,
            is_active: staff.is_active,
          }
        : undefined;

      setDetailWorkerCard(jobToWorkerCard(job, checklist, apiWorker, t));
    },
    [jobsById, staffList, t]
  );

  const handleDetailJobStatus = useCallback(
    async (status: ApiJob['status']) => {
      if (!detailJobId) return;
      try {
        const res = await api.patch(`/api/jobs/${detailJobId}`, { status });
        if (res.status === 200) {
          setJobsById((prev) => {
            const cur = prev[detailJobId];
            if (!cur) return prev;
            return { ...prev, [detailJobId]: { ...cur, status } };
          });
          void loadJobs();
        } else {
          alert(res.error?.message || 'Statusa ni bilo mogoče posodobiti.');
        }
      } catch (err) {
        console.error(err);
        alert('Težava pri povezavi z strežnikom.');
      }
    },
    [detailJobId, loadJobs]
  );

  const loadAttachments = useCallback(async () => {
    setAttachmentsLoading(true);
    try {
      const res = await api.get<{ files: ApiFileRow[] }>('/api/files');
      if (res.status !== 200) {
        setAttachmentsList([]);
        return;
      }
      const mapped: DbAttachmentRow[] = [];
      for (const f of res.data?.files ?? []) {
        const category = dbAttachmentCategory({
          attachment_type: f.attachment_type,
          document_type: f.document_type,
        });
        if (!category) continue;
        mapped.push({
          id: f.id,
          jobId: f.job_id,
          date: f.created_at,
          project: f.job_title || '—',
          name: f.file_name,
          aiDetails:
            f.document_preview?.trim() ||
            `Dokument - ${f.file_name.trim() || 'datoteka'}`,
          uploadedByName: f.uploaded_by_name?.trim() || '—',
          category,
          signedUrl: f.signed_url,
        });
      }
      setAttachmentsList(mapped);
    } catch (err) {
      console.error(err);
      setAttachmentsList([]);
    } finally {
      setAttachmentsLoading(false);
    }
  }, []);

  /** Fresh signed URL on open — list URLs expire (Mark InvalidJWT / exp). */
  const openAttachmentPreview = useCallback(async (item: DbAttachmentRow) => {
    setPreviewAttachmentName(item.name);
    setPreviewAttachmentUrl(item.signedUrl);
    try {
      const res = await api.get<{ file: { signed_url: string | null } }>(
        `/api/files/${item.id}`
      );
      if (res.status === 200 && res.data?.file?.signed_url) {
        setPreviewAttachmentUrl(res.data.file.signed_url);
        return;
      }
    } catch (err) {
      console.error(err);
    }
    if (!item.signedUrl) {
      alert('Predogleda ni bilo mogoče odpreti.');
      setPreviewAttachmentName('');
      setPreviewAttachmentUrl(null);
    }
  }, []);

  const loadZaznamki = useCallback(async () => {
    setZaznamkiLoading(true);
    try {
      const res = await api.get<{
        customers: Array<{
          id: string;
          name: string;
          notes?: { id: string; note: string }[];
        }>;
      }>('/api/customers');
      if (res.status !== 200) {
        setZaznamkiList([]);
        setZaznamkiCustomerOptions([]);
        return;
      }
      const customers = res.data?.customers ?? [];
      // Mark a13: table shows ONLY customers that have notes (one row per customer,
      // all notes stacked in the 2nd column). Empty customers must not appear.
      setZaznamkiList(
        customers
          .map((c) => ({
            customerId: c.id,
            customerName: c.name,
            notes: c.notes ?? [],
          }))
          .filter((c) => c.notes.length > 0)
      );
      setZaznamkiCustomerOptions(customers.map((c) => c.name).filter(Boolean));
    } catch (err) {
      console.error(err);
      setZaznamkiList([]);
      setZaznamkiCustomerOptions([]);
    } finally {
      setZaznamkiLoading(false);
    }
  }, []);

  const loadOfficeNotes = useCallback(async () => {
    if (staffList.length === 0) return;
    setNotesLoading(true);
    try {
      const [remindersRes] = await Promise.all([
        api.get<{ reminders: ApiOfficeReminder[] }>('/api/office-reminders?all=1'),
      ]);
      if (remindersRes.status !== 200) {
        setOfficeNotes([]);
        return;
      }
      const nameById = new Map(staffList.map((s) => [s.id, s.full_name]));
      // Reminders include created_by on the raw row even if ApiOfficeReminder omits it.
      setOfficeNotes(
        ((remindersRes.data?.reminders as Array<
          ApiOfficeReminder & { created_by?: string }
        >) ?? []).map((r) => ({
          id: r.id,
          date: r.remind_on || r.created_at,
          who: (r.created_by && nameById.get(r.created_by)) || '—',
          project: r.title,
          content: r.description?.trim() || '',
          time: formatTimeOfDay(r.created_at, r.remind_time),
        }))
      );
    } catch (err) {
      console.error(err);
      setOfficeNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, [staffList]);

  useEffect(() => {
    if (!authLoading && user) {
      void loadStaff();
    }
  }, [authLoading, user, loadStaff]);

  useEffect(() => {
    if (authLoading || !user) return;
    if (activeTab === 1) void loadJobs();
    if (activeTab === 3) {
      void loadAttachments();
      if (attachmentSubTab === 5) void loadZaznamki();
    }
    if (activeTab === 4) void loadOfficeNotes();
  }, [
    activeTab,
    attachmentSubTab,
    authLoading,
    user,
    loadJobs,
    loadZaznamki,
    loadAttachments,
    loadOfficeNotes,
  ]);

  // Reset pagination & set default sorts when switching tabs
  useEffect(() => {
    setCurrentPage(1);
    setShowFilterPanel(false);
    if (activeTab === 0) {
      setSortField('created_at');
      setSortOrder('asc');
    } else if (activeTab === 1) {
      setSortField('date');
      setSortOrder('desc');
    } else if (activeTab === 3 || activeTab === 4) {
      setSortField('date');
      setSortOrder('desc');
    }
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [attachmentSubTab]);

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

      // Proper date sort for both DD.MM.YY and ISO strings
      if (
        (sortField === 'date' || sortField === 'created_at') &&
        typeof valA === 'string' &&
        typeof valB === 'string'
      ) {
        const parseDate = (s: string) => {
          // ISO format: 2026-08-03T12:30:00Z
          if (s.includes('T') || s.includes('-')) {
            const t = new Date(s).getTime();
            return Number.isNaN(t) ? 0 : t;
          }
          // DD.MM.YY format: 24.07.26
          const parts = s.split('.');
          if (parts.length === 3) {
            const d = Number(parts[0]);
            const m = Number(parts[1]);
            const y = Number(parts[2]);
            const fullYear = y < 50 ? 2000 + y : 1900 + y;
            return new Date(fullYear, m - 1, d).getTime();
          }
          return 0;
        };
        const timeA = parseDate(valA);
        const timeB = parseDate(valB);
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

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
    if (staffRoleFilter !== 'all') {
      result = result.filter((s) => s.role === staffRoleFilter);
    }
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
    let result = [...jobsList];
    const query = searchQueries[1]?.toLowerCase() || '';
    if (query) {
      result = result.filter(
        (j) =>
          j.customer.toLowerCase().includes(query) ||
          j.project.toLowerCase().includes(query) ||
          j.workerName.toLowerCase().includes(query)
      );
    }
    return getSortedData(result);
  };

  const getFilteredZaznamki = () => {
    let result = [...zaznamkiList];
    const query = searchQueries[2]?.toLowerCase() || '';
    if (query) {
      result = result.filter(
        (c) =>
          c.customerName.toLowerCase().includes(query) ||
          c.notes.some((n) => parseNoteText(n.note).text.toLowerCase().includes(query))
      );
    }
    return result.sort((a, b) => a.customerName.localeCompare(b.customerName));
  };

  // Attachments filtering & sorting — category from saved DB fields
  const getFilteredAttachments = () => {
    let result =
      attachmentSubTab === 0
        ? [...attachmentsList]
        : attachmentSubTab === 1
          ? attachmentsList.filter((a) => a.category === 'invoice')
          : attachmentSubTab === 2
            ? attachmentsList.filter((a) => a.category === 'document')
            : attachmentSubTab === 3
              ? attachmentsList.filter((a) => a.category === 'image')
              : attachmentSubTab === 4
                ? attachmentsList.filter((a) => a.category === 'other')
                : [...attachmentsList];

    return getSortedData(result);
  };

  // Notes filtering & sorting
  const getFilteredNotes = () => {
    let result = [...officeNotes];
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

  // Select filtered items based on current active tab.
  // Tab 5 (Podatki podjetja) has its own company-profile UI — not a table dataset.
  // Priponke (3) + Zaznamki sub-tab (5) → customer notes dataset.
  const getActiveDataset = () => {
    switch (activeTab) {
      case 0:
        return getFilteredStaff();
      case 1:
        return getFilteredJobs();
      case 3:
        return attachmentSubTab === 5 ? getFilteredZaznamki() : getFilteredAttachments();
      case 4:
        return getFilteredNotes();
      case 5:
        return [];
      default:
        return [];
    }
  };

  const activeDataset = getActiveDataset();
  const totalPages = Math.max(1, Math.ceil(activeDataset.length / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedDataset = activeDataset.slice(startIndex, startIndex + rowsPerPage);
  const tableLoading =
    (activeTab === 0 && staffLoading) ||
    (activeTab === 1 && jobsLoading) ||
    (activeTab === 3 && attachmentSubTab === 5 && zaznamkiLoading) ||
    (activeTab === 3 && attachmentSubTab !== 5 && attachmentsLoading) ||
    (activeTab === 4 && notesLoading);

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

  const handleSaveCompanyPhone = async () => {
    if (!user) return;
    const stored = toStoredSiPhone(companyPhone);
    if (companyPhone.trim() && !stored) {
      alert('Vnesite veljavno telefonsko številko.');
      return;
    }
    setPhoneSaving(true);
    try {
      const res = await api.patch(`/api/users/${user.id}`, {
        phone: stored,
      });
      if (res.status === 200) {
        setCompanyPhone(toLocalSiPhoneDisplay(stored || ''));
        alert('Telefon shranjen.');
      } else {
        alert(res.error?.message || 'Telefona ni bilo mogoče shraniti.');
      }
    } catch (err) {
      console.error(err);
      alert('Težava pri povezavi z strežnikom.');
    } finally {
      setPhoneSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    setPasswordBusy(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email: user.email });
      if (res.status === 200 || res.status === 201) {
        alert('Poslali smo povezavo za ponastavitev gesla na vaš e-poštni naslov.');
      } else {
        alert(res.error?.message || 'Ponastavitve gesla ni bilo mogoče začeti.');
      }
    } catch (err) {
      console.error(err);
      alert('Težava pri povezavi z strežnikom.');
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleBilling = async () => {
    setBillingBusy(true);
    try {
      const path =
        company?.stripe_customer_id && company?.subscription_active
          ? '/api/billing/portal'
          : '/api/billing/checkout';
      const res = await api.post<{ url: string }>(path, {});
      if (res.status === 200 && res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      alert(res.error?.message || 'Naročila ni bilo mogoče odpreti.');
    } catch (err) {
      console.error(err);
      alert('Težava pri povezavi z strežnikom.');
    } finally {
      setBillingBusy(false);
    }
  };

  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const handleDeleteOfficeNote = async (noteId: string) => {
    if (deletingNoteId) return;
    setDeletingNoteId(noteId);
    try {
      const res = await api.patch(`/api/office-reminders/${noteId}`, { hidden: true });
      if (res.status === 200) {
        setOfficeNotes((prev) => prev.filter((n) => n.id !== noteId));
      } else {
        alert(res.error?.message || 'Zapiska ni bilo mogoče izbrisati.');
      }
    } catch (err) {
      console.error(err);
      alert('Težava pri povezavi z strežnikom.');
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleUploadAttachment = async () => {
    if (!attachJobId || !attachFile) {
      alert('Izberite opravilo in datoteko.');
      return;
    }
    const validation = validateJobAttachmentFile(attachFile);
    if (!validation.ok) {
      alert(jobAttachmentErrorMessage(validation.error, t));
      return;
    }
    setAttachUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', attachFile);
      const res = await api.post(`/api/jobs/${attachJobId}/files`, formData);
      if (res.status === 200 || res.status === 201) {
        setIsAddAttachmentOpen(false);
        setAttachFile(null);
        setAttachJobId('');
        // Immediate list refresh, then OCR/preview may arrive async — re-poll.
        await loadAttachments();
        window.setTimeout(() => {
          void loadAttachments();
        }, 2500);
        window.setTimeout(() => {
          void loadAttachments();
        }, 6000);
      } else {
        alert(res.error?.message || 'Priponke ni bilo mogoče naložiti.');
      }
    } catch (err) {
      console.error(err);
      alert('Težava pri povezavi z strežnikom.');
    } finally {
      setAttachUploading(false);
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
      {/* LEFT SIDEBAR — top as before (Mark: do NOT push left column down) */}
      <aside className="w-64 bg-white border-r border-slate-200 shrink-0 flex flex-col py-8 px-4 min-h-screen">
        <div className="flex flex-col">
          {/* Nazaj — basic for now; button polish later per Mark */}
          <div className="px-3">
            <Link
              href="/dashboard/office"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-[#1c305a] transition-colors"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              Nazaj
            </Link>
          </div>

          {/* Clear space under Nazaj — not stacked tight (Mark) */}
          <div className="px-3 mt-10 mb-8">
            <Link
              href="/dashboard/office"
              className="w-full block bg-[#2b5493] hover:bg-[#1c305a] text-white rounded-[8px] text-xs font-semibold py-2.5 px-4 text-center shadow-sm transition-colors cursor-pointer"
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
              <Columns3 className="h-[18px] w-[18px] shrink-0 text-slate-500" />
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
              <Folder className="h-[18px] w-[18px] shrink-0 text-slate-500" />
              <span className='font-inter font-medium text-base leading-6 align-middle'>Dela</span>
            </button>

            <button
              onClick={() => setActiveTab(3)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-xs font-medium transition-all cursor-pointer text-left w-full ${
                activeTab === 3
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Folder className="h-[18px] w-[18px] shrink-0 text-slate-500" />
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
              <Folder className="h-[18px] w-[18px] shrink-0 text-slate-500" />
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
              <Folder className="h-[18px] w-[18px] shrink-0 text-slate-500" />
              <span className='font-inter font-medium text-base leading-6 align-middle'>Podatki podjetja</span>
            </button>

            <button
              onClick={() => setIsAddWorkerOpen(true)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer text-left w-full"
            >
              <Folder className="h-[18px] w-[18px] shrink-0 text-slate-500" />
              <span className='font-inter font-medium text-base leading-6 align-middle'>Dodaj sodelavca</span>
            </button>

            <button
              onClick={() => setIsAddTaskOpen(true)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer text-left w-full"
            >
              <Folder className="h-[18px] w-[18px] shrink-0 text-slate-500" />
              <span className='font-inter font-medium text-base leading-6 align-middle'>Terenska kartica</span>
            </button>

            <button
              type="button"
              onClick={() => void handleBilling()}
              disabled={billingBusy || user?.role !== 'owner'}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer w-full disabled:opacity-50"
            >
              <Folder className="h-[18px] w-[18px] shrink-0 text-slate-500" />
              <span className='font-inter font-medium text-base leading-6 align-middle'>
                {billingBusy ? '…' : 'Naročilo'}
              </span>
            </button>
          </nav>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top-right user block removed (Mark) */}

        {/* CONTAINER */}
        {/* Room above headline — same as before top-right header was removed (Mark) */}
        <main className="flex-1 px-8 pb-8 pt-20 overflow-y-auto">
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
            {activeTab === 3 && (attachmentSubTab === 5 ? 'Zaznamki' : 'Priponke')}
            {activeTab === 4 && 'Pisarna'}
            {activeTab === 5 && 'Podatki podjetja'}
          </h1>

          {/* Search Bar for Tabs 0, 1, Zaznamki-in-Priponke, 4 */}
          {(activeTab === 0 ||
            activeTab === 1 ||
            activeTab === 4 ||
            (activeTab === 3 && attachmentSubTab === 5)) && (
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex items-center gap-4">
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
                  value={
                    searchQueries[
                      activeTab === 3 && attachmentSubTab === 5 ? 2 : activeTab
                    ] || ''
                  }
                  onChange={(e) => {
                    const key = activeTab === 3 && attachmentSubTab === 5 ? 2 : activeTab;
                    setSearchQueries({
                      ...searchQueries,
                      [key]: e.target.value,
                    });
                  }}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilterPanel((v) => !v)}
                className="h-9 w-9 border border-slate-200 rounded-[8px] bg-white hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                title="Filter"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.5 3H10.5M3 6H9M4.5 9H7.5" stroke="#242731" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              </div>
              {showFilterPanel && activeTab === 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Dostop:</span>
                  <select
                    value={staffRoleFilter}
                    onChange={(e) => {
                      setStaffRoleFilter(e.target.value as typeof staffRoleFilter);
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-white border border-slate-200 rounded-[8px] px-3 py-1.5 text-xs text-slate-700"
                  >
                    <option value="all">Vsi</option>
                    <option value="owner">Vodja</option>
                    <option value="manager">Pisarna</option>
                    <option value="worker">Teren</option>
                  </select>
                </div>
              )}
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
                  <span className="text-[#242731] text-sm font-medium">{company?.name || '—'}</span>
                </div>
              </div>

              {/* Panoga row */}
              <div className="flex gap-12 py-2 border-b border-slate-100">
                <span className="w-32 text-[#8A94A6] text-sm">Panoga</span>
                <span className="text-[#242731] text-sm font-medium">{company?.business_module || '—'}</span>
              </div>
              
              {/* Telefon row */}
              <div className="flex flex-col gap-2 py-2 border-b border-slate-100">
                <div className="flex gap-12 items-center">
                  <span className="w-32 text-[#8A94A6] text-sm">Telefon</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#242731] text-sm font-medium">+386</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="30 123 456"
                      maxLength={11}
                      value={companyPhone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9\s]/g, '');
                        setCompanyPhone(value);
                      }}
                      className="w-32 h-8 px-2 rounded border border-slate-200 text-sm text-[#242731] focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
                <div className="pl-44">
                  <button
                    type="button"
                    onClick={() => void handleSaveCompanyPhone()}
                    disabled={phoneSaving}
                    className="text-[#3B82F6] hover:underline text-xs font-medium cursor-pointer disabled:opacity-50"
                  >
                    {phoneSaving ? '…' : 'Shrani številko'}
                  </button>
                </div>
              </div>

              {/* E-pošta row */}
              <div className="flex gap-12 py-2 border-b border-slate-100">
                <span className="w-32 text-[#8A94A6] text-sm">E-pošta</span>
                <span className="text-[#242731] text-sm font-medium">{officeContact?.email || user?.email || '—'}</span>
              </div>

              {/* Geslo row */}
              <div className="flex flex-col gap-2 py-2 border-b border-slate-100">
                <div className="flex gap-12">
                  <span className="w-32 text-[#8A94A6] text-sm">Geslo</span>
                  <span className="text-[#242731] text-sm font-medium">***********</span>
                </div>
                <div className="pl-44">
                  <button
                    type="button"
                    onClick={() => void handleChangePassword()}
                    disabled={passwordBusy}
                    className="text-[#3B82F6] hover:underline text-sm font-medium cursor-pointer disabled:opacity-50"
                  >
                    {passwordBusy ? '…' : 'Spremeni geslo'}
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
                            {renderHeaderCell('Geslo', undefined, false)}
                            <th className="px-6 py-4 font-normal text-slate-500 text-xs tracking-normal text-right"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {staffLoading ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                Nalaganje podatkov zaposlenih...
                              </td>
                            </tr>
                          ) : paginatedDataset.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
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
                                <td className="px-6 py-4 text-slate-800" style={tdStyle12}>
                                  {member.email}
                                </td>
                                <td className="px-6 py-4 text-slate-800 font-mono" style={tdStyle12}>
                                  {member.role === 'owner' ? '—' : member.login_pin || '—'}
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
                    {(jobsCustomerFilter || jobsWorkerFilter) && (
                      <div className="px-6 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs">
                        <span className="text-slate-600">
                          Filter:{' '}
                          {jobsCustomerFilter
                            ? `stranka “${jobsCustomerFilter}”`
                            : null}
                          {jobsCustomerFilter && jobsWorkerFilter ? ' · ' : null}
                          {jobsWorkerFilter
                            ? `terenec “${
                                jobsList.find((j) => j.workerId === jobsWorkerFilter)
                                  ?.workerName || jobsWorkerFilter
                              }”`
                            : null}
                        </span>
                        <button
                          type="button"
                          className="text-[#2b5493] hover:underline font-medium cursor-pointer"
                          onClick={() => {
                            setJobsCustomerFilter(null);
                            setJobsWorkerFilter(null);
                          }}
                        >
                          Počisti filter
                        </button>
                      </div>
                    )}
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/60">
                            {renderHeaderCell('Datum', 'date', true)}
                            {renderHeaderCell('Stranka', 'customer', true)}
                            {renderHeaderCell('Dela', undefined, false)}
                            {renderHeaderCell('Terenec', 'workerName', true)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {tableLoading ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                Nalaganje…
                              </td>
                            </tr>
                          ) : paginatedDataset.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                {dataError || 'Ni najdenih opravil.'}
                              </td>
                            </tr>
                          ) : (
                            paginatedDataset.map((job: DbJobRow) => (
                              <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-slate-800" style={tdStyle12}>
                                  {formatDate(job.date)}
                                </td>
                                <td className="px-6 py-4 text-slate-800 font-medium" style={tdStyle12}>
                                  {job.customer !== '—' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setJobsWorkerFilter(null);
                                        setJobsCustomerFilter(job.customer);
                                      }}
                                      className="text-left hover:underline cursor-pointer bg-transparent border-none p-0 outline-none text-[#2b5493]"
                                    >
                                      {job.customer}
                                    </button>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="px-6 py-4 text-slate-800" style={tdStyle12}>
                                  <button
                                    type="button"
                                    onClick={() => void openJobDetail(job.id)}
                                    className="text-left hover:underline cursor-pointer bg-transparent border-none p-0 outline-none text-[#2b5493]"
                                  >
                                    {job.project}
                                  </button>
                                </td>
                                <td className="px-6 py-4 text-slate-800" style={tdStyle12}>
                                  {job.workerId ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setJobsCustomerFilter(null);
                                        setJobsWorkerFilter(job.workerId);
                                      }}
                                      className="text-left hover:underline cursor-pointer bg-transparent border-none p-0 outline-none text-[#2b5493]"
                                    >
                                      {job.workerName}
                                    </button>
                                  ) : (
                                    '—'
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

                {/* TAB 3: Priponke (+ Zaznamki sub-tab) */}
                {activeTab === 3 && (
                  <div>
                    {/* Category bar — Zaznamki lives here (Mark), not left sidebar */}
                    <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                      <div className="flex gap-6 flex-wrap">
                        {['Vse', 'Računi', 'Dokumenti', 'Slike', 'Ostalo', 'Zaznamki'].map((sub, idx) => (
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
                        type="button"
                        onClick={() => {
                          if (attachmentSubTab === 5) {
                            setIsAddZaznamekOpen(true);
                            return;
                          }
                          if (jobsList.length === 0) void loadJobs();
                          setIsAddAttachmentOpen(true);
                        }}
                        className="text-sm text-slate-400 hover:text-[#242731] cursor-pointer font-medium hover:underline"
                      >
                        Dodaj
                      </button>
                    </div>

                    {attachmentSubTab === 5 ? (
                      <>
                        <div className="overflow-x-auto w-full">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50/60">
                                {renderHeaderCell('Stranka', 'customerName', true)}
                                {renderHeaderCell('Zaznamki', undefined, false)}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {tableLoading ? (
                                <tr>
                                  <td colSpan={2} className="px-6 py-12 text-center text-slate-400">
                                    Nalaganje…
                                  </td>
                                </tr>
                              ) : paginatedDataset.length === 0 ? (
                                <tr>
                                  <td colSpan={2} className="px-6 py-12 text-center text-slate-400">
                                    Ni zaznamkov.
                                  </td>
                                </tr>
                              ) : (
                                paginatedDataset.map((row: DbZaznamekRow) => (
                                  <tr key={row.customerId} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-slate-800 font-medium align-top" style={tdStyle12}>
                                      {row.customerName}
                                    </td>
                                    <td className="px-6 py-4 text-slate-800 align-top" style={tdStyle12}>
                                      <ul className="flex flex-col gap-2 list-none p-0 m-0">
                                        {row.notes.map((n) => {
                                          const { text } = parseNoteText(n.note);
                                          return (
                                            <li key={n.id} className="flex items-start justify-between gap-3">
                                              <span className="whitespace-pre-line break-words">{text || '—'}</span>
                                              <button
                                                type="button"
                                                className="shrink-0 text-[11px] hover:underline cursor-pointer"
                                                style={{ color: '#24273166' }}
                                                onClick={async () => {
                                                  const res = await api.delete(`/api/customer-notes/${n.id}`);
                                                  if (res.status === 200) void loadZaznamki();
                                                }}
                                              >
                                                Izbriši
                                              </button>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/60">
                            {renderHeaderCell('Datum', 'date', true)}
                            {renderHeaderCell('Dela', 'project', true)}
                            {renderHeaderCell('Dodal', 'uploadedByName', true)}
                            {renderHeaderCell('ime priponke', undefined, false)}
                            {renderHeaderCell('AI Extract', undefined, false)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {tableLoading ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                Nalaganje…
                              </td>
                            </tr>
                          ) : paginatedDataset.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                Ni najdenih datotek v tej kategoriji.
                              </td>
                            </tr>
                          ) : (
                            paginatedDataset.map((item: DbAttachmentRow) => (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-2 align-top text-slate-800" style={tdStyle12}>
                                  {formatDate(item.date)}
                                </td>
                                <td className="px-6 py-2 align-top text-slate-800" style={tdStyle12}>
                                  <button
                                    type="button"
                                    onClick={() => void openJobDetail(item.jobId)}
                                    className="text-left hover:underline cursor-pointer bg-transparent border-none p-0 outline-none text-[#2b5493]"
                                  >
                                    {item.project}
                                  </button>
                                </td>
                                <td className="px-6 py-2 align-top text-slate-800" style={tdStyle12}>
                                  {item.uploadedByName}
                                </td>
                                <td className="px-6 py-2 align-top text-blue-600 font-medium" style={tdStyle12}>
                                  {item.signedUrl || item.id ? (
                                    <button
                                      type="button"
                                      onClick={() => void openAttachmentPreview(item)}
                                      className="text-left hover:underline cursor-pointer bg-transparent border-none p-0 outline-none text-blue-600"
                                    >
                                      {item.name}
                                    </button>
                                  ) : (
                                    item.name
                                  )}
                                </td>
                                <td className="px-6 py-2 align-top text-slate-800 whitespace-pre-line break-words leading-relaxed" style={tdStyle12}>
                                  {item.aiDetails}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    )}
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
                          {tableLoading ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                Nalaganje…
                              </td>
                            </tr>
                          ) : paginatedDataset.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                Ni najdenih zapiskov.
                              </td>
                            </tr>
                          ) : (
                            paginatedDataset.map((note: DbOfficeNoteRow) => (
                              <tr key={note.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-slate-800" style={tdStyle12}>
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
                                    type="button"
                                    disabled={deletingNoteId === note.id}
                                    onClick={() => void handleDeleteOfficeNote(note.id)}
                                    className="hover:text-red-600 cursor-pointer transition-colors disabled:opacity-40"
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
                          ? 'bg-[#2b5493] text-white shadow-sm'
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
      <AddWorkerCard
        isOpen={isAddWorkerOpen}
        onOpenChange={setIsAddWorkerOpen}
        onAddWorker={async (w) => {
          try {
            const res = await api.post('/api/users', {
              email: w.email,
              full_name: w.name,
              role: w.role,
              phone: w.phone,
              // PIN from the form = Auth password (login: email + PIN).
              password: w.password,
            });
            if (res.status === 201 || res.status === 200) {
              await loadStaff();
            } else {
              throw new Error(res.error?.message || 'Napaka pri dodajanju sodelavca.');
            }
          } catch (err) {
            console.error(err);
            throw err instanceof Error
              ? err
              : new Error('Težava pri povezavi z strežnikom.');
          }
        }}
        existingUsers={staffList.filter((s) => s.is_active)}
      />

      <AddCustomerNoteDialog
        open={isAddZaznamekOpen}
        onOpenChange={setIsAddZaznamekOpen}
        customerNameEditable
        customerNameOptions={zaznamkiCustomerOptions}
        onSuccess={() => {
          void loadZaznamki();
        }}
      />

      <WorkerDetailModal
        key={detailJobId ?? 'db-job-detail'}
        isOpen={isJobDetailOpen}
        onOpenChange={(open) => {
          setIsJobDetailOpen(open);
          if (!open) {
            setDetailJobId(null);
            setDetailWorkerCard(null);
          }
        }}
        worker={detailWorkerCard}
        jobId={detailJobId}
        cardNumber={
          detailJobId && jobsById[detailJobId]
            ? jobNumber(jobsById[detailJobId])
            : null
        }
        customerName={
          detailJobId ? jobsById[detailJobId]?.customer ?? null : null
        }
        scheduledAt={
          detailJobId ? jobsById[detailJobId]?.scheduled_at ?? null : null
        }
        cardMutable={
          detailJobId && jobsById[detailJobId]
            ? isJobCardMutable({
                scheduled_at: jobsById[detailJobId].scheduled_at,
                created_at: jobsById[detailJobId].created_at,
              })
            : true
        }
        onRefresh={() => void loadJobs()}
        jobStatus={detailJobId ? jobsById[detailJobId]?.status : undefined}
        onChangeJobStatus={
          detailJobId ? (status) => void handleDetailJobStatus(status) : undefined
        }
        canManageCustomerNotes
      />

      <AddCustomerNoteDialog
        open={isAddZaznamekOpen}
        onOpenChange={setIsAddZaznamekOpen}
        customerNameEditable
        customerNameOptions={zaznamkiCustomerOptions}
        onSuccess={() => {
          void loadZaznamki();
        }}
      />

      <WorkerDetailModal
        key={detailJobId ?? 'db-job-detail'}
        isOpen={isJobDetailOpen}
        onOpenChange={(open) => {
          setIsJobDetailOpen(open);
          if (!open) {
            setDetailJobId(null);
            setDetailWorkerCard(null);
          }
        }}
        worker={detailWorkerCard}
        jobId={detailJobId}
        cardNumber={
          detailJobId && jobsById[detailJobId]
            ? jobNumber(jobsById[detailJobId])
            : null
        }
        customerName={
          detailJobId ? jobsById[detailJobId]?.customer ?? null : null
        }
        scheduledAt={
          detailJobId ? jobsById[detailJobId]?.scheduled_at ?? null : null
        }
        onRefresh={() => void loadJobs()}
        jobStatus={detailJobId ? jobsById[detailJobId]?.status : undefined}
        onChangeJobStatus={
          detailJobId ? (status) => void handleDetailJobStatus(status) : undefined
        }
        canManageCustomerNotes
      />

      <AddTaskModal
        isOpen={isAddTaskOpen}
        onOpenChange={setIsAddTaskOpen}
        workers={staffList
          .filter((w) => w.is_active)
          .map((w) => ({
            id: w.id,
            name: w.full_name,
            phone: w.phone,
          }))}
        defaultDate={new Date().toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\s+/g, '')}
        onAddTask={async (taskData) => {
          try {
            const res = await api.post('/api/jobs', taskData);
            if (res.status === 201 || res.status === 200) {
              await loadJobs();
              setActiveTab(1);
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

      <Dialog
        open={isAddAttachmentOpen}
        onOpenChange={(open) => {
          setIsAddAttachmentOpen(open);
          if (!open) {
            setAttachFile(null);
            setAttachJobId('');
          }
        }}
      >
        <DialogContent className="max-w-sm w-[90vw] bg-white rounded-[8px] p-6 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">
              Dodaj priponko
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 my-4 text-xs text-slate-600">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700">Opravilo</span>
              <select
                value={attachJobId}
                onChange={(e) => setAttachJobId(e.target.value)}
                className="h-9 rounded-[8px] border border-slate-200 px-3 bg-white"
              >
                <option value="">Izberite opravilo</option>
                {jobsList.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.project}
                  </option>
                ))}
              </select>
            </label>
            <AuraFileInput
              id="db-attach-file"
              onFile={(file) => setAttachFile(file)}
              onReject={(message) => alert(message)}
            />
            {attachFile ? (
              <span className="text-slate-500">{attachFile.name}</span>
            ) : null}
          </div>
          <DialogFooter className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsAddAttachmentOpen(false)}
              className="flex-1 h-9 rounded-[8px] border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              Prekliči
            </button>
            <button
              type="button"
              disabled={attachUploading}
              onClick={() => void handleUploadAttachment()}
              className="flex-1 h-9 rounded-[8px] bg-[#0A1128] hover:bg-[#152042] text-white text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              {attachUploading ? 'Nalagam…' : 'Naloži'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attachment inline preview (Mark a13: open, don't force download) */}
      <Dialog
        open={!!previewAttachmentUrl}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewAttachmentUrl(null);
            setPreviewAttachmentName('');
          }
        }}
      >
        <DialogContent className="max-w-4xl w-[min(96vw,900px)] h-[min(90vh,720px)] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-4 py-3 border-b border-slate-100 shrink-0">
            <DialogTitle className="text-sm font-semibold truncate pr-8">
              {previewAttachmentName || 'Predogled'}
            </DialogTitle>
          </DialogHeader>
          {previewAttachmentUrl ? (
            <iframe
              title={previewAttachmentName}
              src={previewAttachmentUrl}
              className="flex-1 w-full border-0 bg-slate-50"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
