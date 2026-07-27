// Hand-written row/domain types matching supabase/migrations/0001_init.sql.
// (Can later be replaced by `supabase gen types typescript` output in db.ts.)

import type {
  JobStatus,
  MessageType,
  AttachmentType,
  NotificationType,
  UserRole,
} from "@/config/constants";
import type { TimelineEventType } from "@/lib/timeline/events";
import type { BusinessModule } from "@/config/business-modules";

// Resolved on every authenticated request (Authorization order, spec §12).
// A caller is exactly one of these kinds — never both — so company-scoped
// handlers can require "company_user" and platform admin tokens are rejected
// by construction rather than by a permission flag that could be misconfigured.
export interface CompanyUserContext {
  kind: "company_user";
  userId: string;
  companyId: string;
  role: UserRole;
  email: string;
}

export interface PlatformAdminContext {
  kind: "platform_admin";
  userId: string;
  email: string;
}

export type AuthContext = CompanyUserContext | PlatformAdminContext;

export interface PlatformAdminRow {
  id: string;
  email: string;
  created_at: string;
}

export interface CompanyRow {
  id: string;
  name: string;
  business_module: BusinessModule;
  subscription_active: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  paypal_subscription_id: string | null;
  subscription_status: string | null;
  created_at: string;
}

export interface UserRow {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface JobRow {
  id: string;
  company_id: string;
  created_by: string;
  status: JobStatus;
  title: string;
  description: string | null;
  priority: string | null;
  customer: string | null;
  location: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  hidden_at: string | null;
  hidden_by: string | null;
}

export interface JobAssignmentRow {
  id: string;
  company_id: string;
  job_id: string;
  worker_id: string;
  assigned_by: string;
  created_at: string;
}

export interface ChecklistItemRow {
  id: string;
  company_id: string;
  job_id: string;
  label: string;
  order_index: number;
  is_completed: boolean;
  completed_at: string | null;
  requires_attachment: boolean;
  created_at: string;
}

export interface JobFileRow {
  id: string;
  company_id: string;
  job_id: string;
  uploaded_by: string;
  file_name: string;
  attachment_type: AttachmentType;
  storage_path: string;
  thumbnail_path: string | null;
  file_size: number;
  file_hash: string;
  ocr_text: string | null;
  document_type: string | null;
  document_preview: string | null;
  hidden_at: string | null;
  created_at: string;
}

export interface JobMessageRow {
  id: string;
  company_id: string;
  job_id: string;
  sender_id: string;
  recipient_id: string | null;
  message_type: MessageType;
  content: string | null;
  attachment_id: string | null;
  is_urgent: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  company_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  job_id: string | null;
  is_read: boolean;
  hidden_at: string | null;
  created_at: string;
}

export interface TimelineEventRow {
  id: string;
  company_id: string;
  job_id: string;
  event_type: TimelineEventType;
  user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OfficeReminderRow {
  id: string;
  company_id: string;
  created_by: string;
  title: string;
  description: string | null;
  is_urgent: boolean;
  remind_on: string | null;
  /** Form-entered wall clock (HH:mm), not created_at. */
  remind_time: string | null;
  actions: string[];
  action_state: Record<string, unknown>;
  phone: string | null;
  link: string | null;
  order_index: number;
  hidden_at: string | null;
  created_at: string;
}
