export type InstituteStatus =
  | 'approved' | 'awaiting_payment' | 'paid' | 'onboarding' | 'free_period'
  | 'active' | 'grace' | 'suspended' | 'lapsed' | 'cancelled' | 'rejected';

export type Role = 'institute_admin' | 'teacher' | 'student';

export type Institute = {
  id: string; slug: string; name: string; type: string; city: string; state: string; address: string;
  gst_number: string; contact_name: string; contact_email: string; contact_phone: string;
  logo_path: string | null; status: InstituteStatus; wave_id: string | null; wave_full: boolean;
  member_number: number | null; enquiry_ref: string | null;
  approved_at: string | null; paid_at: string | null; training_at: string | null; go_live_at: string | null;
  free_period_ends_at: string | null; free_period_paused_days: number; pause_used: boolean;
  minimum_term_ends_at: string | null; lock_ends_at: string | null; lock_lost: boolean;
  grace_started_at: string | null; payment_due_at: string | null; suspended_at: string | null;
  lapsed_at: string | null; cancelled_at: string | null; rejected_reason: string | null;
  data_deleted_at: string | null; reminders_sent: string[];
  terms_version_accepted: string | null; terms_accepted_at: string | null; consent_declared_at: string | null;
  created_at: string; updated_at: string;
};

export type PortalUser = {
  id: string; institute_id: string; role: Role; display_name: string; username: string | null;
  email: string | null; status: 'active' | 'archived'; current_session_id: string | null;
  last_login_at: string | null; created_by: string | null; created_at: string;
};

export type Batch = {
  id: string; institute_id: string; name: string; course: string; schedule_text: string;
  starts_on: string | null; ends_on: string | null; join_code: string; join_code_expires_at: string | null;
  self_join: boolean; status: 'active' | 'archived'; created_at: string;
};

export type Wave = {
  id: string; code: 'founding' | 'charter'; name: string; places: number; join_price_paise: number;
  first_month_paise: number; onboarding_paise: number; bundle_saving_paise: number; free_months: number; sort: number;
};
export type Plan = { code: 'starter' | 'growth' | 'pro'; name: string; student_limit: number; teacher_limit: number; regular_price_paise: number; sort: number };
export type WavePrice = { wave_id: string; plan_code: Plan['code']; price_paise: number; extra_pack_paise: number; extra_teacher_paise: number };

export type Subscription = {
  id: string; institute_id: string; plan_code: Plan['code'] | null; price_paise: number | null;
  extra_packs: number; extra_teachers: number; billing_day: number | null; status: string;
  mandate_status: string; current_period_start: string | null; current_period_end: string | null;
  recommended_plan_code: Plan['code'] | null; recommended_extra_packs: number;
  recommendation_due_at: string | null; plan_confirmed_at: string | null; peak_active: number;
};

/* What the simulator engine's serialize() returns (see engine.js, SAVE + LOAD). */
export type BuildData = { v?: number; [key: string]: unknown };

export type FormState = { error?: string; ok?: string; data?: unknown } | null;

export const ROLE_LABEL: Record<Role, string> = { institute_admin: 'Admin', teacher: 'Teacher', student: 'Student' };
export const ROLE_HOME: Record<Role, string> = { institute_admin: 'admin/dashboard', teacher: 'teacher/batches', student: 'student/home' };

export const STATUS_LABEL: Record<InstituteStatus, string> = {
  approved: 'Approved', awaiting_payment: 'Awaiting payment', paid: 'Paid', onboarding: 'Onboarding',
  free_period: 'Free period', active: 'Active', grace: 'Grace (payment due)', suspended: 'Suspended',
  lapsed: 'Lapsed', cancelled: 'Cancelled', rejected: 'Rejected',
};

/* Statuses in which the institute's portal is open. */
export const OPEN_STATUSES: InstituteStatus[] = ['paid', 'onboarding', 'free_period', 'active', 'grace', 'suspended'];

export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';

export const logoUrl = (path: string | null, v?: string) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/institute-logos/${path}${v ? `?v=${Date.parse(v)}` : ''}` : null;
