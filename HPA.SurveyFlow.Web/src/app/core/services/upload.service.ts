import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';

export interface UploadResult {
  url: string;
  key: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  upload(file: File): Observable<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadResult>(this.api.apiUrl('/api/uploads'), formData);
  }

  getUploadUrl(key: string): string {
    return `${environment.apiBaseUrl}/api/uploads/${key}`;
  }

  normalizeUploadUrl(value: string): string {
    if (!value) {
      return value;
    }

    // If the value starts with '/api/uploads/', prepend the apiBase
    if (value.startsWith('/api/uploads/')) {
      return environment.apiBaseUrl + value;
    }

    // If it's a full URL pointing to an /api/uploads/ path, normalize to current apiBase
    try {
      const url = new URL(value);
      if (url.pathname.startsWith('/api/uploads/')) {
        return environment.apiBaseUrl + url.pathname;
      }
    } catch {
      // Not a valid URL, return as-is
    }

    return value;
  }
}
