import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { tap } from 'rxjs/operators';
import { TOKEN_KEY } from '../services/api.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toastr = inject(ToastrService);
  const token = localStorage.getItem(TOKEN_KEY);

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    tap({
      error: (err) => {
        if (!(err instanceof HttpErrorResponse)) return;

        // Skip global handling for background/silent requests (e.g. health check)
        if (req.headers.has('X-Silent')) return;

        if (err.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          router.navigate(['/login']);
          return;
        }

        if (err.status === 403) {
          router.navigate(['/error/403']);
          return;
        }

        if (err.status === 0 || err.status >= 500) {
          // Network error or server error — let components decide whether to redirect
          // Only show a toast; components can also navigate to /error/500 themselves.
          const isNetworkError = err.status === 0;
          const msg = isNetworkError
            ? 'Cannot reach the server. Please check your connection.'
            : `Server error (${err.status}). Please try again later.`;
          toastr.error(msg, isNetworkError ? 'Offline' : 'Server Error', { timeOut: 6000 });
          return;
        }

        if (err.status === 404) {
          // 404s from API calls are component-level concerns, not navigation.
          // Let individual components handle them.
          return;
        }
      },
    })
  );
};
