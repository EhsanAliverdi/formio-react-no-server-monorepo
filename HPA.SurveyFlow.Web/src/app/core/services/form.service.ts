import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Form, PaginatedResult } from '../models';

@Injectable({ providedIn: 'root' })
export class FormService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(mode?: string, category?: string, silent = false, terminalCode?: string | null): Observable<Form[]> {
    let params = new HttpParams();
    if (mode !== undefined) params = params.set('mode', mode);
    if (category !== undefined) params = params.set('category', category);
    if (terminalCode) params = params.set('terminal_code', terminalCode);
    const headers = silent ? new HttpHeaders({ 'X-Silent': '1' }) : new HttpHeaders();
    return this.http.get<Form[]>(this.api.apiUrl('/api/forms'), { params, headers });
  }

  listPaged(options: { mode?: string; category?: string; q?: string; terminal_code?: string | null; limit?: number; offset?: number; silent?: boolean } = {}): Observable<PaginatedResult<Form>> {
    let params = new HttpParams().set('paged', true);
    if (options.mode !== undefined) params = params.set('mode', options.mode);
    if (options.category !== undefined) params = params.set('category', options.category);
    if (options.q) params = params.set('q', options.q);
    if (options.terminal_code) params = params.set('terminal_code', options.terminal_code);
    if (options.limit != null) params = params.set('limit', options.limit);
    if (options.offset != null) params = params.set('offset', options.offset);
    const headers = options.silent ? new HttpHeaders({ 'X-Silent': '1' }) : new HttpHeaders();
    return this.http.get<PaginatedResult<Form>>(this.api.apiUrl('/api/forms'), { params, headers });
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

  duplicate(id: number): Observable<{ success: boolean; id: number }> {
    return this.http.post<{ success: boolean; id: number }>(this.api.apiUrl(`/api/forms/${id}/duplicate`), {});
  }

  submit(id: number, data: any, parentSubmissionId?: number | null, terminalCode?: string | null): Observable<{
    success: boolean;
    id: number;
    has_errors: boolean;
    has_warnings: boolean;
    error_count: number;
    warning_count: number;
    outcome?: 'success' | 'warning' | 'error';
    next_form_id?: number | null;
    secondary_submit?: { success: boolean; message?: string; error?: string } | null;
  }> {
    return this.http.post<any>(
      this.api.apiUrl(`/api/forms/${id}/submit`),
      { data, parent_submission_id: parentSubmissionId ?? null, terminal_code: terminalCode ?? null }
    );
  }
}
