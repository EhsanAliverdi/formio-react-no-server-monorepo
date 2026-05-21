export interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  display_name?: string;
  preferred_name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  pronouns?: string;
  date_of_birth?: string;
  phone?: string;
  job_title?: string;
  department?: string;
  company?: string;
  website_url?: string;
  bio?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  timezone?: string;
  locale?: string;
  avatar_url?: string;
}

export interface AuthedUser {
  id: number;
  email: string;
  role: string;
  display_name?: string;
  preferred_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

export interface Form {
  id: number;
  name: string;
  json: any;
  allow_anonymous_submit: number;
  visibility: string;
  allowed_roles?: string[];
  allowed_user_ids?: number[];
}

export interface FormSubmission {
  id: number;
  form_id: number;
  form_name: string;
  user_id?: number;
  user_email?: string;
  submitted_at: string;
  updated_at?: string;
  can_export_pdf: boolean;
  form?: any;
  data?: any;
}

export interface AbnormalityItem {
  key: string;
  type?: string;
  label?: string;
  normal_value?: any;
  level: 'error' | 'warning';
}

export interface AdminSubmission extends FormSubmission {
  updated_by?: number;
  updated_by_email?: string;
  edit_history?: any;
  has_abnormalities: boolean;
  error_count: number;
  warning_count: number;
  abnormalities?: AbnormalityItem[];
  secondary_submit_status?: string | null;   // null | 'pending' | 'success' | 'failed'
  secondary_submit_response?: any;
  secondary_submit_at?: string | null;
}

export interface SiteSettings {
  siteName: string;
  faviconUrl?: string;
  logoExpandedLightUrl?: string;
  logoExpandedDarkUrl?: string;
  logoCollapsedUrl?: string;
  logoExpandedWidth?: string;
  logoExpandedHeight?: string;
  logoCollapsedSize?: string;
}

export interface AdminStats {
  totalForms: number;
  totalSubmissions: number;
  submittedForms: number;
  submissionsToday: number;
  submissionsLast7Days: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  occurred_at: string;
  title: string;
  summary: string;
  actor?: {
    id: number;
    email: string;
    display_name?: string;
    avatar_url?: string;
  };
  entity?: {
    kind: string;
    id: number;
    form_id?: number;
  };
  link?: string;
  details?: any;
}

export interface EmailIntegration {
  enabled: boolean;
  provider: 'smtp' | 'sendgrid';
  smtpHost?: string;
  smtpPort?: string;
  smtpUsername?: string;
  smtpPasswordSet: boolean;
  smtpTls: boolean;
  sendgridApiKeySet: boolean;
  fromEmail?: string;
  fromName?: string;
}

export interface MexIntegration {
  enabled: boolean;
  baseUrl?: string;
  apiKeySet: boolean;
}

export interface Integrations {
  email: EmailIntegration;
  mex: MexIntegration;
}

export interface ScheduledJob {
  id: number;
  job_key: string;
  display_name: string;
  description?: string;
  cron_expression: string;
  is_enabled: boolean;
  sync_mode: 'delta' | 'full';           // "delta" = since last run | "full" = all data every run
  only_update_changed: boolean;          // skip records where source hasn't changed
  parameter_schema?: string | null;
  default_parameters?: string | null;
  created_at: string;
  updated_at: string;
  last_run?: JobRunSummary | null;
  next_run_at?: string | null;
}

export interface TriggerJobParams {
  dateFrom?: string;       // ISO date
  dateTo?: string;
  fullHistorical?: boolean;
  purgeBeforeSync?: boolean;  // dev/UAT only — deletes all existing records first
}

export interface JobRun {
  id: number;
  job_key: string;
  display_name: string;
  trigger_type: string;
  triggered_by_email?: string;
  started_at: string;
  completed_at?: string | null;
  status: 'running' | 'success' | 'failed';
  error_message?: string | null;
  result_summary?: string | null;
}

export interface JobRunSummary {
  status: string;
  started_at: string;
  completed_at?: string | null;
  result_summary?: string | null;
  error_message?: string | null;
}

export interface DataSourceOption {
  value: string;
  label: string;
  category?: string;
  location?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total?: number;
  limit: number;
  offset: number;
}

