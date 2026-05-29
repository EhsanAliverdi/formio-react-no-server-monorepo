import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  check(): Observable<boolean> {
    return this.http.get(this.api.apiUrl('/api/settings/site'), {
      observe: 'response',
      headers: { 'X-Silent': '1' },
    }).pipe(
      map(() => true),
      catchError((err) => {
        // Any HTTP response (even 4xx/5xx) means the server is reachable.
        // Only a network error (status 0) means the server is down.
        if (err?.status === 0) return of(false);
        return of(true);
      })
    );
  }
}
