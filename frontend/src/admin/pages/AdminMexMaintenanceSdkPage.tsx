import { useParams } from "react-router-dom";
import { MexMaintenanceModuleDetails } from "../../shared/components/mex-maintenance";

export default function AdminMexMaintenanceSdkPage() {
  const { moduleId } = useParams<{ moduleId: string }>();

  if (!moduleId) {
    return null;
  }

  return <MexMaintenanceModuleDetails moduleId={moduleId} basePath="/admin/mex/sdk-help" />;
}
