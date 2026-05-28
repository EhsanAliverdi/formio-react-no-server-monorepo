import { PlaceholderCategory } from '../models';

export interface PlaceholderFormField {
  key: string;
  label: string;
}

/** All context placeholders available in any rule/integration template. */
export const STATIC_PLACEHOLDER_CATEGORIES: PlaceholderCategory[] = [
  {
    label: 'Submission',
    placeholders: [
      { key: 'submission_id',   label: 'Submission ID',                   description: 'Unique identifier assigned to this submission' },
      { key: 'submitted_at',    label: 'Submitted At',                    description: 'ISO timestamp when the form was submitted' },
      { key: 'outcome',         label: 'Outcome',                         description: 'success, warning, or error' },
      { key: 'error_count',     label: 'Error Count',                     description: 'Number of error-level abnormal answers' },
      { key: 'warning_count',   label: 'Warning Count',                   description: 'Number of warning-level abnormal answers' },
    ],
  },
  {
    label: 'Form',
    placeholders: [
      { key: 'form_name', label: 'Form Name', description: 'Name of the form that was submitted' },
    ],
  },
  {
    label: 'User',
    placeholders: [
      { key: 'user_email',    label: 'User Email',     description: 'Email of the signed-in submitter (empty for anonymous)' },
      { key: 'user_fullname', label: 'User Full Name', description: 'Full name of the signed-in submitter' },
    ],
  },
  {
    label: 'Abnormal Answers',
    placeholders: [
      { key: 'abnormal_answers',   label: 'Abnormal Answers (plain text)',  description: 'All warning & error answers as plain text' },
      { key: 'warning_answers',    label: 'Warning Answers (plain text)',   description: 'Warning-level answers as plain text' },
      { key: 'error_answers',      label: 'Error Answers (plain text)',     description: 'Error-level answers as plain text' },
      { key: 'abnormal_questions', label: 'Abnormal Question Labels',       description: 'Comma-separated labels of abnormal questions' },
      { key: 'warning_questions',  label: 'Warning Question Labels',        description: 'Comma-separated labels of warning questions' },
      { key: 'error_questions',    label: 'Error Question Labels',          description: 'Comma-separated labels of error questions' },
    ],
  },
  {
    label: 'Aggregates (HTML — email only)',
    placeholders: [
      { key: 'abnormal_answers_table', label: 'Abnormal Answers Table',  description: 'HTML table of all abnormal field values' },
      { key: 'error_answers_table',    label: 'Error Answers Table',     description: 'HTML table of error-level abnormalities' },
      { key: 'warning_answers_table',  label: 'Warning Answers Table',   description: 'HTML table of warning-level abnormalities' },
      { key: 'all_answers_table',      label: 'All Answers Table',       description: 'HTML table of the full submission' },
      { key: 'matched_conditions',     label: 'Matched Conditions',      description: 'Summary of which rule conditions were matched' },
    ],
  },
];

/**
 * Build the full placeholder category list for a given context.
 * Pass formFields to include a dynamic "Form Fields" category with field:key entries.
 */
export function buildPlaceholderCategories(
  formFields: PlaceholderFormField[] = [],
  includeHtmlAggregates = true,
): PlaceholderCategory[] {
  const base = includeHtmlAggregates
    ? STATIC_PLACEHOLDER_CATEGORIES
    : STATIC_PLACEHOLDER_CATEGORIES.filter(c => !c.label.includes('HTML'));

  const fieldCategory: PlaceholderCategory | null = formFields.length > 0
    ? {
        label: 'Form Fields',
        placeholders: formFields.map(f => ({
          key: `field:${f.key}`,
          label: f.label,
          description: `Value submitted for "${f.label}"`,
        })),
      }
    : null;

  return fieldCategory ? [...base, fieldCategory] : base;
}
