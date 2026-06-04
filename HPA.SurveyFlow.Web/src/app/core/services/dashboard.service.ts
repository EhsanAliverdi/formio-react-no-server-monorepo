import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  Dashboard,
  DashboardCard,
  PaginatedResult,
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
    return this.listPaged().pipe(map(result => result.items));
  }

  listPaged(options: { limit?: number; offset?: number; terminal_code?: string | null } = {}): Observable<PaginatedResult<Dashboard>> {
    let params = new HttpParams();
    if (options.limit != null) params = params.set('limit', options.limit);
    if (options.offset != null) params = params.set('offset', options.offset);
    if (options.terminal_code) params = params.set('terminal_code', options.terminal_code);
    return this.http.get<PaginatedResult<Dashboard>>(this.api.apiUrl('/api/reporting/dashboards'), { params });
  }

  get(id: number): Observable<Dashboard> {
    return this.http.get<Dashboard>(this.api.apiUrl(`/api/reporting/dashboards/${id}`));
  }

  getBySlug(slug: string, terminalCode?: string | null): Observable<Dashboard> {
    const params = terminalCode ? new HttpParams().set('terminal_code', terminalCode) : undefined;
    return this.http.get<Dashboard>(this.api.apiUrl(`/api/reporting/dashboards/by-slug/${slug}`), { params });
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

  duplicate(id: number): Observable<Dashboard> {
    return this.http.post<Dashboard>(this.api.apiUrl(`/api/reporting/dashboards/${id}/duplicate`), {});
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

  executePublicCard(slug: string, cardId: number, data: RunReportRequest, terminalCode?: string | null): Observable<ReportExecutionResult> {
    const params = terminalCode ? new HttpParams().set('terminal_code', terminalCode) : undefined;
    return this.http.post<ReportExecutionResult>(
      this.api.apiUrl(`/api/reporting/dashboards/by-slug/${slug}/cards/${cardId}/execute`),
      data,
      { params },
    );
  }
}
