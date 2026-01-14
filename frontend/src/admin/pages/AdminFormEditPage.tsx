import { useNavigate, useParams } from "react-router-dom";
import AdminFormEditor from "../../shared/components/formio/AdminFormEditor";
import { updateForm } from "../../shared/services/formService";
import { useForms } from "../../shared/components/formio";

export default function AdminFormEditPage() {
  const navigate = useNavigate();
  const params = useParams();
  const id = Number(params.id);
  const { forms, loading, error, loadForms, EMPTY_FORM, safeSchema } = useForms();

  return (
    <AdminFormEditor
      mode="edit"
      formId={Number.isFinite(id) ? id : null}
      forms={forms}
      loading={loading}
      error={error}
      loadForms={loadForms}
      EMPTY_FORM={EMPTY_FORM}
      safeSchema={safeSchema}
      onUpdate={(formId, { name, schema, access }) => updateForm(formId, { name, schema, access })}
      onBack={() => navigate("/admin/forms")}
    />
  );
}
