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
  'admin.form.general': topic('General configuration', 'Contains the form identity, access, public presentation, category, and submission options saved with the form.'),
  'admin.form.name': topic('Form name', 'The required name used to identify the form in administration screens and exported SurveyFlow JSON files.'),
  'admin.form.parent': topic('Parent form', 'Links this form to another form as a child form. A follow-up submission can reference the parent submission, and the API validates that the child form belongs to that parent form.'),
  'admin.form.access-control': topic('Access control', 'Restricted forms can be opened by administrators, editors, explicitly allowed roles, and explicitly allowed users. These assignments are used when SurveyFlow checks access to a restricted form.'),
  'admin.form.public-link': topic('Public link', 'Opens the form through the public form route without the surrounding site layout. This is suitable for direct sharing or embedding. Form visibility and anonymous submission rules still apply.'),
  'admin.form.preview-before-submit': topic('Preview before submission', 'Shows a review step before the public form is submitted. The person filling the form can review their answers before confirming submission.'),
  'admin.form.draft-pdf': topic('Draft PDF before submit', 'Allows the person filling the form to generate a draft PDF before the final submission is sent.'),
  'admin.form.submission-pdf': topic('Submission PDF export', 'Allows the person filling the form to export a PDF after a successful submission.'),
  'admin.form.color-coded-answers': topic('Color-coded answers', 'Highlights configured abnormal answers while a person fills the form: normal answers are green, warnings are amber, and critical or error answers are red. The classifications come from the form field abnormality settings.'),
  'admin.form.public-description': topic('Public description', 'Text shown to users with the form on public form screens. Use it to explain the purpose of the form before someone starts filling it in.'),
  'admin.form.category': topic('Category', 'Assigns the form to a category slug so it can appear on that category page. Category layout and category-level presentation settings are managed separately in Admin Categories.'),
  'admin.form.card': topic('Form card', 'Configures the image and fallback icon used for this form card. Category-level layout, columns, card style, and display toggles are configured on the category.'),
  'admin.form.card-image': topic('Card image', 'Uploads a per-form card image. When present, this image is used before the fallback card icon. The upload control accepts image files and the API upload limit shown by this screen is 10 MB.'),
  'admin.form.card-icon': topic('Card icon', 'Selects the fallback icon used for the form card when no card image is present.'),
  'admin.form.notification-rules': {
    key: 'admin.form.notification-rules',
    title: 'Notification rules',
    summary: 'Send email when an enabled rule matches a saved submission.',
    sections: [
      {
        heading: 'Where the rules come from',
        paragraphs: ['Notification rules are saved separately for this form. Opening Edit Form loads the rules assigned to this form. They are not created from the Form Builder components.'],
      },
      {
        heading: 'How a rule runs',
        bullets: [
          'SurveyFlow saves the submission first.',
          'It evaluates the enabled notification rules for this form in their configured order.',
          'Each matching email rule sends its own email when email integration is configured.',
          'The send attempt is recorded in the submission rule log.',
        ],
      },
      {
        heading: 'Example',
        paragraphs: ['For a forklift inspection form, create a rule named "Notify safety team about leaks". Add the condition "Leak detected equals Yes", then send the email to the safety team. Submissions without a reported leak do not send that rule email.'],
      },
      {
        note: 'An empty condition group matches every submission. Use this deliberately for an email that should always be sent.',
      },
    ],
  },
  'admin.form.integration-rules': {
    key: 'admin.form.integration-rules',
    title: 'Integration rules',
    summary: 'Run MEX or webhook integrations when an enabled rule matches a saved submission.',
    sections: [
      {
        heading: 'Where the rules come from',
        paragraphs: ['Integration rules are saved separately for this form and loaded when Edit Form opens. They run in addition to the older outcome-based integration settings in Submission Flow.'],
      },
      {
        heading: 'How a rule runs',
        bullets: [
          'SurveyFlow saves the submission first.',
          'Enabled rules for this form are evaluated in their configured order.',
          'Each matching rule is dispatched in the background so the primary form submission can return without waiting for the external system.',
          'MEX and webhook attempts are recorded in the submission rule log.',
        ],
      },
      {
        heading: 'Example',
        paragraphs: ['For a maintenance request form, create a rule named "Create MEX request for damage". Add the condition "Damage reported equals Yes", select MEX Maintenance, and keep the Create Request action. Only matching submissions dispatch that MEX request.'],
      },
      {
        note: 'An empty condition group matches every submission. Use this deliberately for an integration that should always run.',
      },
    ],
  },
  'admin.form.rule-basics': topic('Rule name and status', 'The rule name identifies the rule in Edit Form and submission rule logs. Only enabled rules are evaluated when a submission is saved. Use a name that explains the business event, such as "Notify safety team about leaks".'),
  'admin.form.rule-validation': topic('Rule validation', 'Shows editor issues such as an empty condition group, a condition without a selected field, or a condition that references a field no longer present in the form. Click the issue badge to see the current list.'),
  'admin.form.rule-conditions': {
    key: 'admin.form.rule-conditions',
    title: 'Trigger conditions',
    summary: 'Decide which submitted answers make a notification or integration rule run.',
    sections: [
      {
        heading: 'Conditions',
        paragraphs: ['A condition compares one submitted form field with a value. Select the field, choose an operator, and enter or select the comparison value. Number fields also expose numeric comparison operators.'],
        bullets: [
          'equals: the submitted answer matches the configured value.',
          'does not equal: the answer is missing or does not match the configured value.',
          'contains: text contains the configured text, or an array contains the configured value.',
          'is empty / is not empty: checks whether an answer is missing or blank.',
          'greater than / less than variants: compare numeric answers.',
        ],
      },
      {
        heading: 'ALL and ANY',
        paragraphs: ['Match ALL (AND) means every item inside the group must match. Match ANY (OR) means at least one item inside the group must match.'],
      },
      {
        heading: 'Example',
        paragraphs: ['To notify only for urgent forklift issues, choose Match ALL and add "Asset type equals Forklift" plus "Severity equals Critical". Both answers must match.'],
      },
    ],
  },
  'admin.form.rule-add-condition': topic('Add condition', 'Adds one answer comparison to the current group. Example: add "Leak detected equals Yes". A rule can contain several conditions, and the surrounding Match ALL or Match ANY selector determines how they are combined.'),
  'admin.form.rule-add-group': topic('Add group', 'Adds a nested Match ANY (OR) group. Use a group when part of the rule needs its own logic. Example: require "Asset type equals Forklift" AND group together either "Leak detected equals Yes" OR "Damage reported equals Yes". Groups can be nested up to the depth exposed by this editor.'),
  'admin.form.notification-overlap': topic('Notification overlap warning', 'Appears when enabled email rules share a recipient. This warning does not block sending: if multiple rules match one submission, that recipient can receive one email from each matching rule. Adjust the conditions when those duplicate emails are not intended.'),
  'admin.form.integration-channel': {
    key: 'admin.form.integration-channel',
    title: 'Integration channel',
    summary: 'Choose the external action executed when this rule matches.',
    sections: [
      {
        heading: 'MEX Maintenance',
        paragraphs: ['Dispatches a MEX maintenance action. The current editor exposes Create Request and allows selected MEX payload fields to be overridden.'],
      },
      {
        heading: 'Webhook',
        paragraphs: ['Sends an HTTP request to the configured URL. You can choose GET, POST, PUT, or PATCH, add headers, and build an optional JSON body using placeholders.'],
      },
    ],
  },
  'admin.form.mex-action': topic('MEX action', 'Selects the MEX maintenance action dispatched by this integration rule. The current screen exposes Create Request. Example: when "Damage reported equals Yes", dispatch Create Request and map the submitted damage notes into Job description.'),
  'admin.form.webhook-method': topic('Webhook method', 'HTTP method used when SurveyFlow calls the webhook URL. GET sends no request body. POST, PUT, and PATCH send the configured JSON body when it is not empty.'),
  'admin.form.webhook-url': topic('Webhook URL', 'Destination called when this webhook rule matches. Example: https://maintenance.example.com/api/incidents. The rule is skipped when no URL is configured.'),
  'admin.form.webhook-headers': topic('Webhook headers', 'Adds optional HTTP headers to the webhook request. Header values can include SurveyFlow placeholders. Example: add X-Submission-Id with value {{submission_id}} so the receiving system can correlate the request.'),
  'admin.form.webhook-body': topic('Webhook body template', 'Optional JSON body sent by POST, PUT, or PATCH webhook requests. Insert placeholders to include submission details. Example: { "submissionId": "{{submission_id}}", "asset": "{{field:asset}}" }. GET requests do not send this body.'),
  'admin.form.submission-flow': topic('Submission flow', 'Configures behavior separately for success, warning, and error outcomes. SurveyFlow derives the outcome from configured abnormal answers, then shows the outcome message and applies the selected follow-up behavior.'),
  'admin.form.outcomes': topic('Submission outcomes', 'Success means no warning or error answers were found. Warning means at least one warning answer and no error answers were found. Error means at least one error answer was found.'),
  'admin.form.outcome-message': topic('Outcome message', 'Shown after submission for the selected outcome. Messages can use SurveyFlow placeholders such as {{outcome}}, {{submission_id}}, {{form_name}}, {{user_email}}, {{error_count}}, {{warning_count}}, {{abnormal_questions}}, {{error_questions}}, {{warning_questions}}, {{abnormal_answers}}, {{error_answers}}, and {{warning_answers}}.'),
  'admin.form.after-message': topic('After message', 'Controls what happens after the outcome message: remain on the result screen, redirect to the configured URL, or open the configured follow-up form.'),
  'admin.form.action-delay': topic('Delay before action', 'Number of seconds to wait before applying the selected action after the outcome message. Use 0 for an immediate action.'),
  'admin.form.redirect-url': topic('Redirect URL', 'Destination used when After message is set to Redirect to URL for this outcome.'),
  'admin.form.follow-up-form': topic('Follow-up form', 'Form opened when After message is set to Open follow-up form. The follow-up submission can be linked to the original submission.'),
  'admin.form.secondary-submit': topic('Outcome integration', 'When enabled, SurveyFlow dispatches the configured secondary integration action for this outcome after saving the submission. The current screen exposes the MEX Create Request action.'),
  'admin.form.payload-mapping': {
    key: 'admin.form.payload-mapping',
    title: 'MEX payload mapping',
    summary: 'Override only the MEX Create Request fields that this form needs to control.',
    sections: [
      {
        heading: 'How defaults work',
        paragraphs: ['Rows left as Default keep the built-in MEX create-request defaults. Configure a row only when this form should replace that default. SurveyFlow converts configured values to the expected MEX type and trims known length-limited strings.'],
      },
      {
        heading: 'Available sources',
        bullets: [
          'Form field: use one submitted answer.',
          'Static value: always send the same configured value.',
          'Template: combine placeholders and text.',
          'Warning/error answers: include abnormal answers detected during submission.',
        ],
      },
      {
        heading: 'Example',
        paragraphs: ['Map Job description from a template such as "Forklift issue: {{field:damage_notes}}". Leave Requested date/time as Default so SurveyFlow uses the submission time.'],
      },
      {
        note: 'MEX validates some values against its own records. For example, Asset must match a real AssetNumber and Job type name must match an existing MEX job type.',
      },
    ],
  },
  'admin.form.outcome-email': topic('Outcome email notification', 'Sends an email for this outcome when enabled and email integration is configured. Recipients, subject, HTML body, and optional PDF attachment are stored in the form schema.'),
  'admin.form.email-recipients': topic('Email recipients', 'Enter one or more recipient addresses. SurveyFlow separates addresses using commas, semicolons, or new lines, removes blank entries, and sends each matching rule email to its distinct recipients. Example: safety@example.com, supervisor@example.com.'),
  'admin.form.email-subject': topic('Email subject', 'Subject line for the email. SurveyFlow replaces supported placeholders before sending. Example: "Critical issue in {{form_name}} submission {{submission_id}}".'),
  'admin.form.email-body': topic('Email body', 'HTML body for the email. SurveyFlow replaces supported placeholders before sending. Use the placeholder picker for submission details and individual form fields such as {{field:asset}}.'),
  'admin.form.email-pdf': topic('Attach submission PDF', 'Generates a PDF of the submitted answers and attaches it to the email when enabled. If PDF generation fails, SurveyFlow logs the failure and continues the email attempt without the attachment.'),
  'admin.form.builder': topic('Form builder', 'Edits the Form.io-compatible schema stored with the SurveyFlow form. The schema contains the components rendered to people filling the form.'),
  'admin.form.type': topic('Form type', 'Single page keeps components in one form. Multi-step wizard groups components into panel steps. When switching to wizard mode, SurveyFlow creates an initial panel if the schema does not already contain one.'),
  'admin.form.versions': topic('Version history', 'SurveyFlow snapshots the current form JSON before JSON changes are saved. Preview shows a stored snapshot. Restore snapshots the current JSON again before replacing it with the selected version.'),
  'admin.form.view': topic('Form preview', 'Renders the saved Form.io schema for an administrator without submitting data. Multi-step forms expose Previous and Next controls for navigating panel steps.'),
  'admin.form.export-pdf': topic('Export form PDF', 'Exports a PDF definition of the form. The PDF can include abnormality rules, conditional logic, validation rules, internal field keys, and wizard-step grouping.'),
  'admin.form.pdf-abnormalities': topic('PDF abnormality rules', 'Includes configured normal, warning, and error answer classifications in the form definition PDF.'),
  'admin.form.pdf-conditions': topic('PDF conditional logic', 'Includes the condition under which a question is displayed in the form definition PDF.'),
  'admin.form.pdf-validation': topic('PDF validation rules', 'Includes supported validation details such as required, minimum and maximum length, numeric limits, and patterns in the form definition PDF.'),
  'admin.form.pdf-keys': topic('PDF field keys', 'Includes each internal form field key beside its label in the form definition PDF.'),
  'admin.form.pdf-steps': topic('PDF wizard steps', 'Adds a section heading for each wizard panel when exporting a multi-step form definition PDF.'),
} satisfies Record<string, HelpTopic>;

export type HelpKey = keyof typeof HELP_CATALOG;

function topic(title: string, summary: string): HelpTopic {
  return { key: '', title, summary, sections: [] };
}
