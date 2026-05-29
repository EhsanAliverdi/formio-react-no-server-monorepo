import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AuditLog, AuditLogListResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(params: {
    entityType?: string;
    actorId?: number;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<AuditLogListResponse> {
    let p = new HttpParams();
    if (params.entityType) p = p.set('entityType', params.entityType);
    if (params.actorId != null) p = p.set('actorId', params.actorId);
    if (params.dateFrom) p = p.set('dateFrom', params.dateFrom);
    if (params.dateTo) p = p.set('dateTo', params.dateTo);
    if (params.search) p = p.set('search', params.search);
    if (params.limit != null) p = p.set('limit', params.limit);
    if (params.offset != null) p = p.set('offset', params.offset);
    return this.http.get<AuditLogListResponse>(this.api.apiUrl('/api/audit-logs'), { params: p });
  }

  entityTypes(): Observable<string[]> {
    return this.http.get<string[]>(this.api.apiUrl('/api/audit-logs/entity-types'));
  }

  exportCsvUrl(params: { entityType?: string; actorId?: number; dateFrom?: string; dateTo?: string }): string {
    let p = new HttpParams();
    if (params.entityType) p = p.set('entityType', params.entityType);
    if (params.actorId != null) p = p.set('actorId', params.actorId);
    if (params.dateFrom) p = p.set('dateFrom', params.dateFrom);
    if (params.dateTo) p = p.set('dateTo', params.dateTo);
    const qs = p.toString();
    return this.api.apiUrl('/api/audit-logs/export-csv') + (qs ? '?' + qs : '');
  }
}
