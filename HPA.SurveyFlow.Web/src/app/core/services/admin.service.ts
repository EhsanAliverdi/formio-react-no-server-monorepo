import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AdminStats, ActivityItem } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(this.api.apiUrl('/api/dashboard/stats'));
  }

  getActivity(limit?: number): Observable<{ items: ActivityItem[] }> {
    let params = new HttpParams();
    if (limit !== undefined) {
      params = params.set('limit', String(limit));
    }
    return this.http.get<{ items: ActivityItem[] }>(
      this.api.apiUrl('/api/dashboard/activity'),
      { params }
    );
  }

  exportPdf(html: string, fileName?: string): Observable<Blob> {
    const body: any = { html };
    if (fileName !== undefined) {
      body.fileName = fileName;
    }
    return this.http.post(
      this.api.apiUrl('/api/pdf-exports'),
      body,
      { responseType: 'blob' as const }
    );
  }
}
