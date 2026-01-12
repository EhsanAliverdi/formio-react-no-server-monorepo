import FormRenderer from "./FormRenderer";
import StepFormRenderer from "./StepFormRenderer";

function hasWizardPanels(schema: unknown): boolean {
  if (!schema || typeof schema !== "object") return false;
  const s = schema as Record<string, unknown>;
  const comps = Array.isArray(s.components) ? s.components : [];
  return comps.some(
    (c) =>
      !!c &&
      typeof c === "object" &&
      (c as Record<string, unknown>).type === "panel" &&
      Array.isArray((c as Record<string, unknown>).components)
  );
}

export default function SmartFormRenderer({
  form,
  onSubmit,
}: {
  form: any;
  onSubmit?: (data: any) => void;
}) {
  const isWizard = form?.display === "wizard" || hasWizardPanels(form);
  return isWizard ? (
    <StepFormRenderer form={form} onSubmit={onSubmit} />
  ) : (
    <FormRenderer form={form} onSubmit={onSubmit} />
  );
}
