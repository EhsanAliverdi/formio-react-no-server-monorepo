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
    path: 'submissions',
    loadComponent: () =>
      import('./pages/submissions.component').then(m => m.SubmissionsComponent),
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./pages/users.component').then(m => m.UsersComponent),
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./pages/notifications.component').then(m => m.AdminNotificationsComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings.component').then(m => m.SettingsComponent),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile.component').then(m => m.ProfileComponent),
  },
];
