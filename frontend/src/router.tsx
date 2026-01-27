import { Navigate, createBrowserRouter } from "react-router-dom";
import AdminLayout from "./admin/layout/AdminLayout";
import HomePage from "./public/pages/HomePage";
import FormsPage from "./public/pages/FormsPage";
import FormsLayoutPage from "./public/pages/FormsLayoutPage";
import FillFormPage from "./public/pages/FillFormPage";
import PublicLayout from "./public/layout/PublicLayout";
import AdminOverviewPage from "./admin/pages/AdminOverviewPage";
import AdminFormsPage from "./admin/pages/AdminFormsPage";
import AdminFormNewPage from "./admin/pages/AdminFormNewPage";
import AdminFormEditPage from "./admin/pages/AdminFormEditPage";
import AdminFormViewPage from "./admin/pages/AdminFormViewPage";
import AdminUsersPage from "./admin/pages/AdminUsersPage";
import AdminProfilePage from "./admin/pages/AdminProfilePage";
import AdminSubmissionsPage from "./admin/pages/AdminSubmissionsPage";
import AdminNotificationsPage from "./admin/pages/AdminNotificationsPage";
import AdminSettingsPage from "./admin/pages/AdminSettingsPage";
import AdminMexMaintenancePage from "./admin/pages/AdminMexMaintenancePage";
import AdminMexMaintenanceSdkPage from "./admin/pages/AdminMexMaintenanceSdkPage";
import AdminMexSettingsPage from "./admin/pages/AdminMexSettingsPage";
import MexMaintenanceOverview from "./shared/components/mex-maintenance/ui/MexMaintenanceOverview";
import MexMaintenanceMaintenance from "./shared/components/mex-maintenance/ui/MexMaintenanceMaintenance";
import MexMaintenanceWorkOrders from "./shared/components/mex-maintenance/ui/MexMaintenanceWorkOrders";
import MexMaintenanceRequests from "./shared/components/mex-maintenance/ui/MexMaintenanceRequests";
import MexMaintenanceStandardJobs from "./shared/components/mex-maintenance/ui/MexMaintenanceStandardJobs";
import MexMaintenanceAssetsInventory from "./shared/components/mex-maintenance/ui/MexMaintenanceAssetsInventory";
import MexMaintenanceAssets from "./shared/components/mex-maintenance/ui/MexMaintenanceAssets";
import MexMaintenanceCatalogue from "./shared/components/mex-maintenance/ui/MexMaintenanceCatalogue";
import MexMaintenanceGoodsReceipts from "./shared/components/mex-maintenance/ui/MexMaintenanceGoodsReceipts";
import MexMaintenanceProcurement from "./shared/components/mex-maintenance/ui/MexMaintenanceProcurement";
import MexMaintenancePurchaseOrders from "./shared/components/mex-maintenance/ui/MexMaintenancePurchaseOrders";
import MexMaintenanceRequisitions from "./shared/components/mex-maintenance/ui/MexMaintenanceRequisitions";
import MexMaintenanceSupplierInvoices from "./shared/components/mex-maintenance/ui/MexMaintenanceSupplierInvoices";
import MexMaintenancePeople from "./shared/components/mex-maintenance/ui/MexMaintenancePeople";
import MexMaintenanceEmployees from "./shared/components/mex-maintenance/ui/MexMaintenanceEmployees";
import MexMaintenanceSuppliers from "./shared/components/mex-maintenance/ui/MexMaintenanceSuppliers";
import MexMaintenanceAdministration from "./shared/components/mex-maintenance/ui/MexMaintenanceAdministration";
import MexMaintenanceAdministrationDetail from "./shared/components/mex-maintenance/ui/MexMaintenanceAdministrationDetail";
import MexMaintenanceReports from "./shared/components/mex-maintenance/ui/MexMaintenanceReports";
import MexMaintenanceReportsDetail from "./shared/components/mex-maintenance/ui/MexMaintenanceReportsDetail";
import SignIn from "./template/tailAdmin/pages/AuthPages/SignIn";
import { ThemeProvider } from "./template/tailAdmin/context/ThemeContext";
import NotificationsPage from "./public/pages/NotificationsPage";
import NoAccessPage from "./public/pages/NoAccessPage";
import MyProfilePage from "./public/pages/MyProfilePage";
import MySubmissionsPage from "./public/pages/MySubmissionsPage";

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'forms/:id/fill', element: <FillFormPage /> },
      {
        path: 'forms',
        element: <FormsLayoutPage />,
        children: [
          { index: true, element: <FormsPage /> },
          { path: 'mysubmissions', element: <MySubmissionsPage /> },
        ],
      },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'myProfile', element: <MyProfilePage /> },
      { path: 'mysubmissions', element: <Navigate to="/forms/mysubmissions" replace /> },
      { path: 'no-access', element: <NoAccessPage /> },
    ],
  },
  {
    path: 'admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminOverviewPage /> },
      { path: 'forms', element: <AdminFormsPage /> },
      { path: 'forms/new', element: <AdminFormNewPage /> },
      { path: 'forms/:id/edit', element: <AdminFormEditPage /> },
      { path: 'forms/:id/view', element: <AdminFormViewPage /> },
      { path: 'submissions', element: <AdminSubmissionsPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'notifications', element: <AdminNotificationsPage /> },
      { path: 'settings', element: <AdminSettingsPage /> },
      {
        path: 'mex',
        element: <AdminMexMaintenancePage />,
        children: [
          { index: true, element: <Navigate to="/admin/mex/overview" replace /> },
          {
            path: 'overview',
            element: <MexMaintenanceOverview basePath="/admin/mex" settingsPath="/admin/mex/settings" />,
          },
          { path: 'maintenance', element: <MexMaintenanceMaintenance basePath="/admin/mex" /> },
          { path: 'maintenance/work-orders', element: <MexMaintenanceWorkOrders /> },
          { path: 'maintenance/requests', element: <MexMaintenanceRequests /> },
          { path: 'maintenance/standard-jobs', element: <MexMaintenanceStandardJobs /> },
          { path: 'assets-inventory', element: <MexMaintenanceAssetsInventory basePath="/admin/mex" /> },
          { path: 'assets-inventory/assets', element: <MexMaintenanceAssets /> },
          { path: 'assets-inventory/catalogue', element: <MexMaintenanceCatalogue /> },
          { path: 'assets-inventory/goods-receipts', element: <MexMaintenanceGoodsReceipts /> },
          { path: 'procurement', element: <MexMaintenanceProcurement basePath="/admin/mex" /> },
          { path: 'procurement/purchase-orders', element: <MexMaintenancePurchaseOrders /> },
          { path: 'procurement/requisitions', element: <MexMaintenanceRequisitions /> },
          { path: 'procurement/supplier-invoices', element: <MexMaintenanceSupplierInvoices /> },
          { path: 'people', element: <MexMaintenancePeople basePath="/admin/mex" /> },
          { path: 'people/employees', element: <MexMaintenanceEmployees /> },
          { path: 'people/suppliers', element: <MexMaintenanceSuppliers /> },
          { path: 'administration', element: <MexMaintenanceAdministration basePath="/admin/mex" /> },
          { path: 'administration/:section', element: <MexMaintenanceAdministrationDetail /> },
          { path: 'reports', element: <MexMaintenanceReports basePath="/admin/mex" /> },
          { path: 'reports/:reportId', element: <MexMaintenanceReportsDetail /> },
          { path: 'settings', element: <AdminMexSettingsPage /> },
          { path: ':moduleId', element: <AdminMexMaintenanceSdkPage /> },
        ],
      },
      { path: 'profile', element: <AdminProfilePage /> },
    ],
  },
  {
    path: 'admin/login',
    element: (
      <ThemeProvider>
        <SignIn />
      </ThemeProvider>
    ),
  },
  {
    path: 'login',
    element: (
      <ThemeProvider>
        <SignIn mode="public" />
      </ThemeProvider>
    ),
  },
]);

export default router;
