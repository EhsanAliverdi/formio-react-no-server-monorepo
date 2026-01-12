import { useNavigate } from "react-router-dom";
import FormsManager from "../../shared/components/formio/FormsManager";
import { createForm, deleteForm } from "../../shared/services/formService";
import { useForms } from "../../shared/components/formio";

export default function AdminFormsPage() {
  const navigate = useNavigate();
  const { forms, loading, error, loadForms } = useForms();

  return (
    <FormsManager
      forms={forms}
      loading={loading}
      error={error}
      onRefresh={loadForms}
      onAdd={() => navigate("/admin/forms/new")}
      onView={(id) => navigate(`/admin/forms/${id}/view`)}
      onEdit={(id) => navigate(`/admin/forms/${id}/edit`)}
      onImportCreate={({ name, schema }) => createForm({ name, schema })}
      onDelete={(id) => deleteForm(id)}
    />
  );
}
