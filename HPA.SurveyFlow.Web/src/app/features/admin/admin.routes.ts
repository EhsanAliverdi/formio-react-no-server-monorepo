import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/overview.component').then(m => m.OverviewComponent),
  },
  {
    path: 'forms',
    loadComponent: () =>
      import('./pages/forms.component').then(m => m.AdminFormsComponent),
  },
  {
    path: 'forms/new',
    loadComponent: () =>
      import('./pages/form-new.component').then(m => m.FormNewComponent),
  },
  {
    path: 'forms/:id/edit',
    loadComponent: () =>
      import('./pages/form-edit.component').then(m => m.FormEditComponent),
  },
  {
    path: 'forms/:id/view',
    loadComponent: () =>
      import('./pages/form-view.component').then(m => m.FormViewComponent),
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./pages/categories.component').then(m => m.CategoriesComponent),
  },
  {
    path: 'pages',
    loadComponent: () =>
      import('./pages/page-list.component').then(m => m.PageListComponent),
  },
  {
    path: 'pages/new',
    loadComponent: () =>
      import('./pages/page-designer.component').then(m => m.PageDesignerComponent),
  },
  {
    path: 'pages/:id/designer',
    loadComponent: () =>
      import('./pages/page-designer.component').then(m => m.PageDesignerComponent),
  },
  {
    path: 'submissions',
    loadComponent: () =>
      import('./pages/submissions.component').then(m => m.SubmissionsComponent),
  },
  {
    path: 'submissions/:id',
    loadComponent: () =>
      import('./pages/submission-detail.component').then(m => m.SubmissionDetailComponent),
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./pages/users.component').then(m => m.UsersComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings.component').then(m => m.SettingsComponent),
  },
  {
    path: 'synced-data',
    loadComponent: () =>
      import('./pages/synced-data.component').then(m => m.SyncedDataComponent),
  },
  {
    path: 'logs',
    loadComponent: () =>
      import('./pages/log-viewer.component').then(m => m.LogViewerComponent),
  },
  {
    path: 'jobs',
    loadComponent: () =>
      import('./pages/job-dashboard.component').then(m => m.JobDashboardComponent),
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./pages/reports.component').then(m => m.ReportsComponent),
  },
  {
    path: 'reports/:formId/designer',
    loadComponent: () =>
      import('./pages/report-designer.component').then(m => m.ReportDesignerComponent),
  },
  {
    path: 'reports/:id/run',
    loadComponent: () =>
      import('./pages/report-viewer.component').then(m => m.ReportViewerComponent),
  },
  {
    path: 'datasets',
    loadComponent: () =>
      import('./pages/datasets.component').then(m => m.DatasetsComponent),
  },
  {
    path: 'reporting/reports',
    redirectTo: 'reports',
    pathMatch: 'full',
  },
  {
    path: 'reporting/datasets',
    redirectTo: 'datasets',
    pathMatch: 'full',
  },
  {
    path: 'reporting/dashboards',
    loadComponent: () =>
      import('./pages/dashboard-list.component').then(m => m.DashboardListComponent),
  },
  {
    path: 'reporting/dashboards/new',
    loadComponent: () =>
      import('./pages/dashboard-create-edit.component').then(m => m.DashboardCreateEditComponent),
  },
  {
    path: 'reporting/dashboards/:id/edit',
    loadComponent: () =>
      import('./pages/dashboard-create-edit.component').then(m => m.DashboardCreateEditComponent),
  },
  {
    path: 'reporting/dashboards/:id/designer',
    loadComponent: () =>
      import('./pages/dashboard-designer.component').then(m => m.DashboardDesignerComponent),
  },
  {
    path: 'integrations',
    loadComponent: () =>
      import('./pages/integrations.component').then(m => m.IntegrationsComponent),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile.component').then(m => m.ProfileComponent),
  },
  {
    path: 'audit-log',
    loadComponent: () =>
      import('./pages/audit-log.component').then(m => m.AuditLogComponent),
  },
  {
    path: 'api-keys',
    loadComponent: () =>
      import('./pages/api-keys.component').then(m => m.ApiKeysComponent),
  },
];
