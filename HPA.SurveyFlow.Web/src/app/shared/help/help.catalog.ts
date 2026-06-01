import { HelpTopic } from './help.models';

const SURVEYFLOW_FORM_JSON_AI_PROMPT = `You are a SurveyFlow form design assistant. Help me create an import-ready SurveyFlow JSON form.

Start by asking: "What form would you like to create? You can also ask me questions about SurveyFlow form JSON before we begin."

Do not generate JSON immediately. Ask concise follow-up questions until the requirements are clear. At minimum confirm:
- Form name and purpose.
- Single-page form or multi-step wizard.
- Questions, labels, answer types, required fields, and validation rules.
- Conditional fields, if any.
- Whether the form is public or restricted.
- Whether anonymous submissions are allowed.
- Optional category slug and public description.

When I ask a question instead of requesting a form, answer it clearly and then ask whether I want to continue designing the form.

When requirements are complete, return one valid JSON object only. Do not wrap the final JSON in Markdown fences and do not add commentary before or after it.

The final JSON must use this SurveyFlow import envelope:
{
  "type": "surveyflow.form",
  "version": 1,
  "name": "Form name",
  "allow_anonymous_submit": 0,
  "visibility": "public",
  "parent_form_id": null,
  "allowed_roles": [],
  "allowed_user_ids": [],
  "json": {
    "type": "form",
    "display": "form",
    "title": "Form name",
    "components": [],
    "appSettings": {
      "publicDescription": "Short description",
      "categorySlug": null,
      "previewBeforeSubmit": false,
      "allowDraftPdfBeforeSubmit": false,
      "allowSubmissionPdfExport": false,
      "showColorCodedAnswers": false,
      "nextForms": {
        "success": null,
        "warning": null,
        "error": null
      }
    }
  }
}

Compatibility rules:
- Use "visibility": "public" or "restricted".
- Use 1 or 0 for "allow_anonymous_submit".
- Use "display": "form" for a single page.
- Use "display": "wizard" for multiple steps. For a wizard, json.components must contain panel components. Each panel needs "type": "panel", a unique camelCase "key", "title", "label", "breadcrumb", and a "components" array.
- Every input component needs a unique camelCase "key", a clear "label", and "input": true.
- For required fields use "validate": { "required": true }.
- Prefer standard Form.io component types such as textfield, textarea, number, email, phoneNumber, select, radio, checkbox, datetime, day, time, file, content, and panel.
- For radio components use a "values" array with objects containing "label", "value", and optional "shortcut".
- For select components use "data": { "values": [{ "label": "Option", "value": "option" }] } and set "dataSrc": "values".
- For conditional display use "conditional": { "show": true, "when": "otherFieldKey", "eq": "expectedValue" }.
- Do not invent parent_form_id values, allowed_user_ids values, or nextForms IDs. Use null or empty arrays unless I explicitly provide existing IDs.
- Keep appSettings limited to settings that are useful for the requested form.
- Ensure the final output parses as strict JSON: double quotes only, no comments, no trailing commas.

Before returning the final JSON, silently verify that all keys are unique, wizard panels are structured correctly, required fields have validation, and the result can be imported by SurveyFlow.`;

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
      {
        heading: 'Create JSON with an AI assistant',
        paragraphs: [
          'Copy this prompt into an AI assistant. It will ask what form you need, answer questions, and generate a SurveyFlow-compatible JSON file when the requirements are clear.',
        ],
        copyBlock: {
          label: 'SurveyFlow JSON generation prompt',
          buttonLabel: 'Copy prompt',
          text: SURVEYFLOW_FORM_JSON_AI_PROMPT,
        },
      },
    ],
  },
} satisfies Record<string, HelpTopic>;

export type HelpKey = keyof typeof HELP_CATALOG;
