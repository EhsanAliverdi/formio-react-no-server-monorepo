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

export interface AdminSubmission extends FormSubmission {
  updated_by?: number;
  updated_by_email?: string;
  edit_history?: any;
  has_abnormalities: boolean;
  abnormal_count: number;
  abnormalities?: any[];
}

export interface Notification {
  id: number;
  title: string;
  body: string;
  level: string;
  created_at: string;
  created_by?: number;
  created_by_email?: string;
  created_by_avatar_url?: string;
  delivered_at: string;
  read_at?: string;
}

export interface AdminNotification {
  id: number;
  title: string;
  body: string;
  level: string;
  created_at: string;
  created_by?: number;
  created_by_email?: string;
  created_by_avatar_url?: string;
  recipient_count: number;
  read_count: number;
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

export interface PaginatedResult<T> {
  items: T[];
  total?: number;
  limit: number;
  offset: number;
}

export interface NotificationsResult {
  items: Notification[];
  unread_count: number;
  limit: number;
  offset: number;
}
