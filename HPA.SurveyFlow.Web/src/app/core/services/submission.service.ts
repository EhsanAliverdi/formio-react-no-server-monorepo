import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FormSubmission, AdminSubmission, PaginatedResult } from '../models';

@Injectable({ providedIn: 'root' })
export class SubmissionService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  listMine(): Observable<{ items: FormSubmission[] }> {
    return this.http.get<{ items: FormSubmission[] }>(this.api.apiUrl('/api/submissions/me'));
  }

  get(id: number): Observable<FormSubmission> {
    return this.http.get<FormSubmission>(this.api.apiUrl(`/api/submissions/${id}`));
  }

  exportPdf(id: number, html: string, fileName?: string): Observable<Blob> {
    const body: any = { html };
    if (fileName !== undefined) {
      body.fileName = fileName;
    }
    return this.http.post(
      this.api.apiUrl(`/api/submissions/${id}/pdf`),
      body,
      { responseType: 'blob' as const }
    );
  }

  listAdmin(params?: any): Observable<PaginatedResult<AdminSubmission>> {
    let httpParams = new HttpParams();
    if (params) {
      for (const key of Object.keys(params)) {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, String(params[key]));
        }
      }
    }
    return this.http.get<PaginatedResult<AdminSubmission>>(
      this.api.apiUrl('/api/admin/submissions'),
      { params: httpParams }
    );
  }

  getAdmin(id: number): Observable<AdminSubmission> {
    return this.http.get<AdminSubmission>(this.api.apiUrl(`/api/admin/submissions/${id}`));
  }

  updateAdmin(id: number, data: any): Observable<AdminSubmission> {
    return this.http.put<AdminSubmission>(
      this.api.apiUrl(`/api/admin/submissions/${id}`),
      data
    );
  }

  exportAdminPdf(html: string, fileName: string): Observable<Blob> {
    return this.http.post(
      this.api.apiUrl('/api/admin/pdf'),
      { html, fileName },
      { responseType: 'blob' as const }
    );
  }

  triggerSecondarySubmit(id: number, outcome?: 'success' | 'warning' | 'error'): Observable<{ success: boolean; message: string }> {
    const params = outcome ? new HttpParams().set('outcome', outcome) : undefined;
    return this.http.post<{ success: boolean; message: string }>(
      this.api.apiUrl(`/api/admin/submissions/${id}/secondary-submit`),
      {},
      { params }
    );
  }
}
