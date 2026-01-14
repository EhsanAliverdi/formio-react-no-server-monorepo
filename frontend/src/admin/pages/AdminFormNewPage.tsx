import { useNavigate } from "react-router-dom";
import AdminFormEditor from "../../shared/components/formio/AdminFormEditor";
import { createForm } from "../../shared/services/formService";
import { useForms } from "../../shared/components/formio";

export default function AdminFormNewPage() {
  const navigate = useNavigate();
  const { forms, loading, error, loadForms, EMPTY_FORM, safeSchema } = useForms();

  return (
    <AdminFormEditor
      mode="add"
      forms={forms}
      loading={loading}
      error={error}
      loadForms={loadForms}
      EMPTY_FORM={EMPTY_FORM}
      safeSchema={safeSchema}
      onCreate={({ name, schema, access }) => createForm({ name, schema, access })}
      onBack={() => navigate("/admin/forms")}
    />
  );
}
