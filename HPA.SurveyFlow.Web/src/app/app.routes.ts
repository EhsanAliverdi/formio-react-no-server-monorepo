import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'maintenance',
    loadComponent: () =>
      import('./features/errors/maintenance.component').then(m => m.MaintenanceComponent),
  },
  {
    path: 'error/403',
    loadComponent: () =>
      import('./features/errors/server-error.component').then(m => m.ServerErrorComponent),
    data: { code: '403', title: 'Access Denied', message: "You don't have permission to access this page." },
  },
  {
    path: 'error/500',
    loadComponent: () =>
      import('./features/errors/server-error.component').then(m => m.ServerErrorComponent),
    data: { code: '500', title: 'Server Error', message: 'An unexpected error occurred on our end. Please try again in a moment.' },
  },
  {
    path: 'error/offline',
    loadComponent: () =>
      import('./features/errors/server-error.component').then(m => m.ServerErrorComponent),
    data: { code: '⚡', title: 'Cannot Reach Server', message: 'The server is not reachable. Please check your connection and try again.' },
  },
  {
    path: 'category/:categorySlug',
    loadComponent: () =>
      import('./features/prestart/pre-start-page.component').then(m => m.PreStartPageComponent),
  },
  {
    path: 'form-public/:id',
    loadComponent: () =>
      import('./features/public/pages/public-form-page.component').then(m => m.PublicFormPageComponent),
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/auth/login.component').then(m => m.LoginComponent),
    data: { mode: 'admin' },
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/public/public-layout.component').then(m => m.PublicLayoutComponent),
    loadChildren: () =>
      import('./features/public/public.routes').then(m => m.publicRoutes),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-layout.component').then(m => m.AdminLayoutComponent),
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.adminRoutes),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/errors/not-found.component').then(m => m.NotFoundComponent),
  },
];
