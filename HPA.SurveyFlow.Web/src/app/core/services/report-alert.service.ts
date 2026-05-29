import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ReportAlert, SaveReportAlertRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class ReportAlertService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(templateId?: number): Observable<ReportAlert[]> {
    let params = new HttpParams();
    if (templateId != null) params = params.set('reportTemplateId', templateId);
    return this.http.get<ReportAlert[]>(this.api.apiUrl('/api/report-alerts'), { params });
  }

  create(data: SaveReportAlertRequest): Observable<ReportAlert> {
    return this.http.post<ReportAlert>(this.api.apiUrl('/api/report-alerts'), data);
  }

  update(id: number, data: SaveReportAlertRequest): Observable<ReportAlert> {
    return this.http.put<ReportAlert>(this.api.apiUrl(`/api/report-alerts/${id}`), data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(this.api.apiUrl(`/api/report-alerts/${id}`));
  }

  trigger(id: number): Observable<{ message: string; last_status: string; last_value: number }> {
    return this.http.post<{ message: string; last_status: string; last_value: number }>(
      this.api.apiUrl(`/api/report-alerts/${id}/trigger`), {}
    );
  }
}
