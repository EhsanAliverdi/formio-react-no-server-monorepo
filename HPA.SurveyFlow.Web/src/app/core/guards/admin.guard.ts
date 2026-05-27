import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TOKEN_KEY } from '../services/api.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    router.navigate(['/admin/login']);
    return false;
  }

  return authService.loadCurrentUser().pipe(
    map(user => {
      if (!user) {
        router.navigate(['/admin/login']);
        return false;
      }
      if (user.role === 'admin' || user.role === 'editor') {
        return true;
      }
      router.navigate(['/no-access']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/admin/login']);
      return of(false);
    })
  );
};
