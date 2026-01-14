import { createBrowserRouter } from "react-router-dom";
import AdminProtectedLayout from "./admin/layout/AdminProtectedLayout";
import HomePage from "./public/pages/HomePage";
import FormsPage from "./public/pages/FormsPage";
import PublicLayout from "./public/layout/PublicLayout";
import AdminPage from "./admin/pages/AdminPage";
import AdminFormsPage from "./admin/pages/AdminFormsPage";
import AdminFormNewPage from "./admin/pages/AdminFormNewPage";
import AdminFormEditPage from "./admin/pages/AdminFormEditPage";
import AdminFormViewPage from "./admin/pages/AdminFormViewPage";
import AdminUsersPage from "./admin/pages/AdminUsersPage";
import AdminProfilePage from "./admin/pages/AdminProfilePage";
import AdminSubmissionsPage from "./admin/pages/AdminSubmissionsPage";
import AdminNotificationsPage from "./admin/pages/AdminNotificationsPage";
import SignIn from "./template/tailAdmin/pages/AuthPages/SignIn";
import { ThemeProvider } from "./template/tailAdmin/context/ThemeContext";
import NotificationsPage from "./public/pages/NotificationsPage";
import NoAccessPage from "./public/pages/NoAccessPage";
import MyProfilePage from "./public/pages/MyProfilePage";

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'forms', element: <FormsPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'myProfile', element: <MyProfilePage /> },
      { path: 'no-access', element: <NoAccessPage /> },
    ],
  },
  {
    path: 'admin',
    element: <AdminProtectedLayout />,
    children: [
      { index: true, element: <AdminPage /> },
      { path: 'forms', element: <AdminFormsPage /> },
      { path: 'forms/new', element: <AdminFormNewPage /> },
      { path: 'forms/:id/edit', element: <AdminFormEditPage /> },
      { path: 'forms/:id/view', element: <AdminFormViewPage /> },
      { path: 'submissions', element: <AdminSubmissionsPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'notifications', element: <AdminNotificationsPage /> },
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
