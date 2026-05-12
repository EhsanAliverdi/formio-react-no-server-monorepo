import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then(m => m.LoginComponent),
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
  { path: '**', redirectTo: '' },
];
