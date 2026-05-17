import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Form } from '../models';

@Injectable({ providedIn: 'root' })
export class FormService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(mode?: string): Observable<Form[]> {
    let params = new HttpParams();
    if (mode !== undefined) {
      params = params.set('mode', mode);
    }
    return this.http.get<Form[]>(this.api.apiUrl('/api/forms'), { params });
  }

  get(id: number, mode?: string): Observable<Form> {
    let params = new HttpParams();
    if (mode !== undefined) {
      params = params.set('mode', mode);
    }
    return this.http.get<Form>(this.api.apiUrl(`/api/forms/${id}`), { params });
  }

  create(data: any): Observable<{ success: boolean; id: number }> {
    return this.http.post<{ success: boolean; id: number }>(
      this.api.apiUrl('/api/forms'),
      data
    );
  }

  update(id: number, data: any): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(
      this.api.apiUrl(`/api/forms/${id}`),
      data
    );
  }

  delete(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(this.api.apiUrl(`/api/forms/${id}`));
  }

  submit(id: number, data: any): Observable<{
    success: boolean;
    id: number;
    has_errors: boolean;
    has_warnings: boolean;
    error_count: number;
    warning_count: number;
    secondary_submit?: { success: boolean; message?: string; error?: string } | null;
  }> {
    return this.http.post<any>(
      this.api.apiUrl(`/api/forms/${id}/submit`),
      { data }
    );
  }
}
