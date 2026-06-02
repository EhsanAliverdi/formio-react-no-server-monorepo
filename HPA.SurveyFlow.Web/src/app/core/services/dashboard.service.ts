import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  Dashboard,
  DashboardCard,
  ReportExecutionResult,
  RunReportRequest,
  SaveDashboardCardRequest,
  SaveDashboardLayoutRequest,
  SaveDashboardRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(): Observable<Dashboard[]> {
    return this.http.get<Dashboard[]>(this.api.apiUrl('/api/reporting/dashboards'));
  }

  get(id: number): Observable<Dashboard> {
    return this.http.get<Dashboard>(this.api.apiUrl(`/api/reporting/dashboards/${id}`));
  }

  getBySlug(slug: string): Observable<Dashboard> {
    return this.http.get<Dashboard>(this.api.apiUrl(`/api/reporting/dashboards/by-slug/${slug}`));
  }

  create(data: SaveDashboardRequest): Observable<Dashboard> {
    return this.http.post<Dashboard>(this.api.apiUrl('/api/reporting/dashboards'), data);
  }

  update(id: number, data: SaveDashboardRequest): Observable<Dashboard> {
    return this.http.put<Dashboard>(this.api.apiUrl(`/api/reporting/dashboards/${id}`), data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(this.api.apiUrl(`/api/reporting/dashboards/${id}`));
  }

  addCard(id: number, data: SaveDashboardCardRequest): Observable<DashboardCard> {
    return this.http.post<DashboardCard>(this.api.apiUrl(`/api/reporting/dashboards/${id}/cards`), data);
  }

  updateCard(id: number, cardId: number, data: SaveDashboardCardRequest): Observable<DashboardCard> {
    return this.http.put<DashboardCard>(this.api.apiUrl(`/api/reporting/dashboards/${id}/cards/${cardId}`), data);
  }

  deleteCard(id: number, cardId: number): Observable<void> {
    return this.http.delete<void>(this.api.apiUrl(`/api/reporting/dashboards/${id}/cards/${cardId}`));
  }

  saveLayout(id: number, data: SaveDashboardLayoutRequest): Observable<void> {
    return this.http.put<void>(this.api.apiUrl(`/api/reporting/dashboards/${id}/layout`), data);
  }

  executePublicCard(slug: string, cardId: number, data: RunReportRequest): Observable<ReportExecutionResult> {
    return this.http.post<ReportExecutionResult>(
      this.api.apiUrl(`/api/reporting/dashboards/by-slug/${slug}/cards/${cardId}/execute`),
      data,
    );
  }
}
