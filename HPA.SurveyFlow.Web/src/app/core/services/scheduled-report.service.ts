import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ScheduledReport, SaveScheduledReportRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class ScheduledReportService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(templateId?: number): Observable<ScheduledReport[]> {
    let params = new HttpParams();
    if (templateId != null) params = params.set('templateId', templateId);
    return this.http.get<ScheduledReport[]>(this.api.apiUrl('/api/scheduled-reports'), { params });
  }

  get(id: number): Observable<ScheduledReport> {
    return this.http.get<ScheduledReport>(this.api.apiUrl(`/api/scheduled-reports/${id}`));
  }

  create(data: SaveScheduledReportRequest): Observable<ScheduledReport> {
    return this.http.post<ScheduledReport>(this.api.apiUrl('/api/scheduled-reports'), data);
  }

  update(id: number, data: SaveScheduledReportRequest): Observable<ScheduledReport> {
    return this.http.put<ScheduledReport>(this.api.apiUrl(`/api/scheduled-reports/${id}`), data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(this.api.apiUrl(`/api/scheduled-reports/${id}`));
  }

  runNow(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.api.apiUrl(`/api/scheduled-reports/${id}/run`), {});
  }
}
