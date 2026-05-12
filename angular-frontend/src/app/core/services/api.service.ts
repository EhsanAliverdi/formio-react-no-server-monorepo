import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const TOKEN_KEY = 'authToken';

@Injectable({ providedIn: 'root' })
export class ApiService {
  protected http = inject(HttpClient);

  apiUrl(path: string): string {
    return environment.apiBaseUrl + path;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(t: string): void {
    localStorage.setItem(TOKEN_KEY, t);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }
}
