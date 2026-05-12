import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { TOKEN_KEY } from '../services/api.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem(TOKEN_KEY);

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    tap({
      error: (err) => {
        if (err instanceof HttpErrorResponse && err.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          router.navigate(['/login']);
        }
      }
    })
  );
};
