import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const publicRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'forms',
    loadComponent: () =>
      import('./pages/forms.component').then(m => m.FormsComponent),
  },
  {
    path: 'forms/mysubmissions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/my-submissions.component').then(m => m.MySubmissionsComponent),
  },
  {
    path: 'forms/:id/fill',
    loadComponent: () =>
      import('./pages/fill-form.component').then(m => m.FillFormComponent),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/notifications.component').then(m => m.NotificationsComponent),
  },
  {
    path: 'myProfile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/my-profile.component').then(m => m.MyProfileComponent),
  },
  {
    path: 'no-access',
    loadComponent: () =>
      import('./pages/no-access.component').then(m => m.NoAccessComponent),
  },
];
