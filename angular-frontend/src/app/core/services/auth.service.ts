import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiService, TOKEN_KEY } from './api.service';
import { AuthedUser } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  currentUser = signal<AuthedUser | null>(null);

  login(email: string, password: string): Observable<{ token: string; expiresAt: string; user: AuthedUser }> {
    return this.http.post<{ token: string; expiresAt: string; user: AuthedUser }>(
      this.api.apiUrl('/api/auth/login'),
      { email, password }
    ).pipe(
      tap(res => {
        this.api.setToken(res.token);
        this.currentUser.set(res.user);
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post<any>(this.api.apiUrl('/api/auth/logout'), {}).pipe(
      tap({
        next: () => {
          this.api.clearToken();
          this.currentUser.set(null);
        },
        error: () => {
          this.api.clearToken();
          this.currentUser.set(null);
        }
      })
    );
  }

  me(): Observable<{ user: AuthedUser }> {
    return this.http.get<{ user: AuthedUser }>(this.api.apiUrl('/api/auth/me'));
  }

  loadCurrentUser(): Observable<AuthedUser | null> {
    return this.me().pipe(
      map(res => {
        this.currentUser.set(res.user);
        return res.user;
      }),
      catchError(err => {
        if (err?.status === 401) {
          this.currentUser.set(null);
          return of(null);
        }
        return of(null);
      })
    );
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === 'admin';
  }

  isPrivileged(): boolean {
    const role = this.currentUser()?.role;
    return role === 'admin' || role === 'editor';
  }
}
