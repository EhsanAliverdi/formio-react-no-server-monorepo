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
  parent_form_id?: number | null;
  allowed_roles?: string[];
  allowed_user_ids?: number[];
}

export interface FormSubmission {
  id: number;
  form_id: number;
  form_name: string;
  parent_submission_id?: number | null;
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
  secondary_submit_ref?: string | null;
  secondary_submit_response?: any;
  secondary_submit_at?: string | null;
  child_submissions?: AdminSubmission[];
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
  copyrightText?: string;
  showCopyright: boolean;
  showPublicFormLogo: boolean;
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

// ── Notification Rules ────────────────────────────────────────────────────────

export type NotificationChannel = 'email'; // future: 'sms' | 'webhook'

export type ConditionOperator =
  | 'equals' | 'not_equals'
  | 'contains'
  | 'greater_than' | 'less_than'
  | 'greater_than_or_equal' | 'less_than_or_equal'
  | 'is_empty' | 'is_not_empty';

export interface ConditionLeaf {
  fieldKey: string;
  conditionOperator: ConditionOperator;
  value?: any;
}

export interface ConditionGroup {
  operator: 'AND' | 'OR';
  children: (ConditionGroup | ConditionLeaf)[];
}

export function isConditionGroup(node: ConditionGroup | ConditionLeaf): node is ConditionGroup {
  return 'children' in node;
}

export interface NotificationRuleEmailConfig {
  to_addresses: string[];
  subject: string;
  body_html: string;
  attach_pdf: boolean;
}

export interface NotificationRule {
  id: number;
  form_id: number;
  name: string;
  enabled: boolean;
  channel: NotificationChannel;
  condition_group: ConditionGroup;
  sort_order: number;
  created_at: string;
  updated_at: string;
  email_config?: NotificationRuleEmailConfig;
}

export interface SaveNotificationRuleRequest {
  name: string;
  enabled: boolean;
  channel: NotificationChannel;
  condition_group: ConditionGroup;
  sort_order: number;
  email_config?: NotificationRuleEmailConfig;
}

// Available placeholder categories for the email body builder
export interface PlaceholderCategory {
  label: string;
  placeholders: PlaceholderDef[];
}

export interface PlaceholderDef {
  key: string;       // e.g. "submission_id"
  label: string;     // e.g. "Submission ID"
  description?: string;
}

// ─── Integration Rules ────────────────────────────────────────────────────────

export type IntegrationChannel = 'mex' | 'webhook';

export type MexFieldMappingSource = 'default' | 'field' | 'static' | 'template' | 'abnormal_answers';

export interface MexFieldMapping {
  source: MexFieldMappingSource;
  fieldKey?: string;    // source: 'field'
  value?: string;       // source: 'static'
  template?: string;    // source: 'template'
  level?: 'all' | 'warning' | 'error';  // source: 'abnormal_answers'
}

export interface IntegrationRuleMexConfig {
  action: 'create_request';
  field_mappings: Record<string, MexFieldMapping>;
}

export interface WebhookHeader {
  name: string;
  value: string;
}

export interface IntegrationRuleWebhookConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers: WebhookHeader[];
  body_template: string;
}

export interface IntegrationRule {
  id: number;
  form_id: number;
  name: string;
  enabled: boolean;
  channel: IntegrationChannel;
  condition_group: ConditionGroup;
  sort_order: number;
  created_at: string;
  updated_at: string;
  mex_config?: IntegrationRuleMexConfig;
  webhook_config?: IntegrationRuleWebhookConfig;
}

export interface SaveIntegrationRuleRequest {
  name: string;
  enabled: boolean;
  channel: IntegrationChannel;
  condition_group: ConditionGroup;
  sort_order: number;
  mex_config?: IntegrationRuleMexConfig;
  webhook_config?: IntegrationRuleWebhookConfig;
}

// ─── Reporting ────────────────────────────────────────────────────────────────

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDescriptor {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select';
  options?: FieldOption[];
  is_conditional?: boolean;
}

export interface FieldDriftEntry {
  field_key: string;
  label: string;
  drift_type: 'missing' | 'type_changed' | 'parent_changed' | 'renamed';
  message: string;
}

export interface ReportColumnDefinition {
  field_key: string;
  label: string;
  width?: number;
  format?: string;
}

export interface GroupByDef {
  field_key: string;
  label: string;
  alias: string;
  date_trunc?: 'day' | 'week' | 'month' | 'quarter' | 'year' | null;
}

export interface MeasureDef {
  field_key?: string;   // null/absent for _count
  label: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  alias?: string;
  format?: string;
}

export interface RlsPolicy {
  id: number;
  name: string;
  where_fragment: string;
  applies_to_roles?: string;
  is_active: boolean;
  created_at: string;
}

export interface SaveRlsPolicyRequest {
  name: string;
  where_fragment: string;
  applies_to_roles?: string;
  is_active: boolean;
}

export type ChartTypeName = 'table' | 'bar' | 'line' | 'pie' | 'doughnut' | 'number_card';

export interface ChartConfig {
  x_axis?: string;
  y_axes?: string[];
}

export interface Dataset {
  id: number;
  name: string;
  description?: string;
  form_id: number;
  base_filters?: ConditionGroup | null;
  fields?: FieldDescriptor[] | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface SaveDatasetRequest {
  name: string;
  description?: string;
  form_id: number;
  base_filters?: ConditionGroup | null;
  fields?: FieldDescriptor[] | null;
  is_active: boolean;
}

export interface ReportTemplate {
  id: number;
  form_id: number;
  form_name: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  columns: ReportColumnDefinition[];
  filters?: ConditionGroup | null;
  default_sort_field?: string;
  default_sort_direction: 'asc' | 'desc';
  default_page_size: number;
  display_mode: 'table';
  has_schema_drift: boolean;
  field_drift?: FieldDriftEntry[];
  tags: string[];
  category?: string;
  shared_with_roles: string[];
  group_by?: GroupByDef[] | null;
  measures?: MeasureDef[] | null;
  is_favourite: boolean;
  chart_type: ChartTypeName;
  chart_config?: ChartConfig | null;
  dataset_id?: number | null;
}

export interface SaveReportTemplateRequest {
  form_id: number;
  name: string;
  description?: string;
  is_public: boolean;
  columns: ReportColumnDefinition[];
  filters?: ConditionGroup | null;
  default_sort_field?: string;
  default_sort_direction: 'asc' | 'desc';
  default_page_size: number;
  display_mode: 'table';
  tags: string[];
  category?: string;
  shared_with_roles: string[];
  group_by?: GroupByDef[] | null;
  measures?: MeasureDef[] | null;
  chart_type: ChartTypeName;
  chart_config?: ChartConfig | null;
  dataset_id?: number | null;
}

export interface RunReportRequest {
  template_id: number;
  runtime_filters?: ConditionGroup | null;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
  page: number;
  page_size: number;
}

export interface ReportExecutionResult {
  columns: ReportColumnDefinition[];
  rows: Record<string, any>[];
  total: number;
  page: number;
  page_size: number;
}

export const MEX_FIELDS: { key: string; label: string; type: 'string' | 'number' | 'boolean' }[] = [
  { key: 'requestNumber',    label: 'Request Number',    type: 'number' },
  { key: 'jobTypeName',      label: 'Job Type Name',     type: 'string' },
  { key: 'jobDescription',   label: 'Job Description',   type: 'string' },
  { key: 'requesterDetails', label: 'Requester Details', type: 'string' },
  { key: 'asset',            label: 'Asset',             type: 'string' },
  { key: 'assetDescription', label: 'Asset Description', type: 'string' },
  { key: 'location',         label: 'Location',          type: 'string' },
  { key: 'priority',         label: 'Priority',          type: 'string' },
  { key: 'estimatedCost',    label: 'Estimated Cost',    type: 'number' },
  { key: 'requestedDateTime',label: 'Requested Date/Time', type: 'string' },
];

