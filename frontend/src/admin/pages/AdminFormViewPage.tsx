import { useParams } from "react-router-dom";
import AdminFormViewer from "../../shared/components/formio/AdminFormViewer";
import { getFormById } from "../../shared/services/formService";

export default function AdminFormViewPage() {
  const params = useParams();
  const id = Number(params.id);

  return (
    <AdminFormViewer
      formId={Number.isFinite(id) ? id : null}
      backTo="/admin/forms"
      loadFormById={getFormById}
    />
  );
}
