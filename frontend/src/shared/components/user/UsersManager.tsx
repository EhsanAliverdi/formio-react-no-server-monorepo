import AdminUserManagement from "./AdminUserManagement";
import type { AdminUserManagementProps } from "./AdminUserManagement";

export type UsersManagerProps = AdminUserManagementProps;

export default function UsersManager(props: UsersManagerProps) {
  return <AdminUserManagement {...props} />;
}
