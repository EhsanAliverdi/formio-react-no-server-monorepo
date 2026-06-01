import { HelpTopic } from './help.models';

export const HELP_CATALOG = {
  'admin.forms.visibility': {
    key: 'admin.forms.visibility',
    title: 'Form visibility',
    summary: 'Visibility controls who can open and use a form.',
    sections: [
      {
        heading: 'Public',
        paragraphs: [
          'The form can be opened without a role or user assignment. Use this for forms intended for general access.',
        ],
      },
      {
        heading: 'Restricted',
        paragraphs: [
          'The form is available only to administrators, editors, and the roles or users explicitly allowed in the form settings.',
        ],
      },
      {
        note: 'Visibility and anonymous submissions work together. Visibility controls access to the form. Anonymous submissions control whether a person must sign in before submitting it.',
      },
    ],
  },
  'admin.forms.anonymous': {
    key: 'admin.forms.anonymous',
    title: 'Anonymous submissions',
    summary: 'Anonymous submissions control whether sign-in is required before a form can be submitted.',
    sections: [
      {
        heading: 'Allowed',
        paragraphs: [
          'A person can submit the form without signing in. The submission is stored without an associated user account.',
        ],
      },
      {
        heading: 'Not allowed',
        paragraphs: [
          'The person must sign in before submitting the form. Their user account is associated with the submission.',
        ],
      },
      {
        note: 'A restricted form still requires access permission. Allowing anonymous submissions does not make a restricted form public.',
      },
    ],
  },
  'admin.forms.import-json': {
    key: 'admin.forms.import-json',
    title: 'Import form JSON',
    summary: 'Import creates a new form from a JSON file and then opens it for review.',
    sections: [
      {
        heading: 'Accepted files',
        paragraphs: [
          'Select a JSON file exported from SurveyFlow or a compatible form schema. The file must contain a JSON object.',
        ],
      },
      {
        heading: 'Imported settings',
        bullets: [
          'SurveyFlow export files retain the form name, schema, visibility, anonymous submission setting, parent form, and access assignments.',
          'A plain compatible schema uses its title or file name as the form name.',
          'Missing visibility defaults to Public and missing anonymous submission settings default to Allowed.',
          'If a form already has the same name, the imported form name receives an "(Imported)" suffix.',
        ],
      },
      {
        note: 'After import, review the new form in Edit mode before sharing it with users.',
      },
    ],
  },
} satisfies Record<string, HelpTopic>;

export type HelpKey = keyof typeof HELP_CATALOG;
