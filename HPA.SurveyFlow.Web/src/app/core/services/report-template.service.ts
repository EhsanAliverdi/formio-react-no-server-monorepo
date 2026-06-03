import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  FieldDescriptor,
  ReportTemplate,
  SaveReportTemplateRequest,
  RunReportRequest,
  ReportExecutionResult,
  ConditionGroup,
  RlsPolicy,
  SaveRlsPolicyRequest,
  PaginatedResult,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ReportTemplateService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(options?: { formId?: number; category?: string; tag?: string; createdBy?: number }): Observable<ReportTemplate[]> {
    return this.listPaged(options).pipe(map(result => result.items));
  }

  listPaged(options?: {
    formId?: number;
    category?: string;
    tag?: string;
    createdBy?: number;
    q?: string;
    favourite?: boolean;
    drift?: boolean;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedResult<ReportTemplate>> {
    let params = new HttpParams();
    if (options?.formId != null) params = params.set('formId', options.formId);
    if (options?.category) params = params.set('category', options.category);
    if (options?.tag) params = params.set('tag', options.tag);
    if (options?.createdBy != null) params = params.set('createdBy', options.createdBy);
    if (options?.q) params = params.set('q', options.q);
    if (options?.favourite) params = params.set('favourite', true);
    if (options?.drift) params = params.set('drift', true);
    if (options?.limit != null) params = params.set('limit', options.limit);
    if (options?.offset != null) params = params.set('offset', options.offset);
    return this.http.get<PaginatedResult<ReportTemplate>>(this.api.apiUrl('/api/report-templates'), { params });
  }

  get(id: number): Observable<ReportTemplate> {
    return this.http.get<ReportTemplate>(this.api.apiUrl(`/api/report-templates/${id}`));
  }

  create(data: SaveReportTemplateRequest): Observable<ReportTemplate> {
    return this.http.post<ReportTemplate>(this.api.apiUrl('/api/report-templates'), data);
  }

  update(id: number, data: SaveReportTemplateRequest): Observable<ReportTemplate> {
    return this.http.put<ReportTemplate>(this.api.apiUrl(`/api/report-templates/${id}`), data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(this.api.apiUrl(`/api/report-templates/${id}`));
  }

  getFormFields(formId: number): Observable<FieldDescriptor[]> {
    return this.http.get<FieldDescriptor[]>(this.api.apiUrl(`/api/report-templates/form-fields/${formId}`));
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(this.api.apiUrl('/api/report-templates/categories'));
  }

  execute(req: RunReportRequest): Observable<ReportExecutionResult> {
    return this.http.post<ReportExecutionResult>(this.api.apiUrl('/api/report-executions'), req);
  }

  exportCsvUrl(
    templateId: number,
    sortField?: string,
    sortDirection?: string,
    runtimeFilters?: ConditionGroup | null,
  ): string {
    let params = new HttpParams().set('templateId', templateId);
    if (sortField) params = params.set('sortField', sortField);
    if (sortDirection) params = params.set('sortDirection', sortDirection);
    if (runtimeFilters) params = params.set('runtimeFilters', JSON.stringify(runtimeFilters));
    return `${this.api.apiUrl('/api/report-executions/export-csv')}?${params.toString()}`;
  }

  exportExcelUrl(
    templateId: number,
    sortField?: string,
    sortDirection?: string,
    runtimeFilters?: ConditionGroup | null,
  ): string {
    let params = new HttpParams().set('templateId', templateId);
    if (sortField) params = params.set('sortField', sortField);
    if (sortDirection) params = params.set('sortDirection', sortDirection);
    if (runtimeFilters) params = params.set('runtimeFilters', JSON.stringify(runtimeFilters));
    return `${this.api.apiUrl('/api/report-executions/export-excel')}?${params.toString()}`;
  }

  // ── Favourites ───────────────────────────────────────────────────────────

  getFavourites(): Observable<number[]> {
    return this.http.get<number[]>(this.api.apiUrl('/api/report-templates/favourites'));
  }

  addFavourite(id: number): Observable<void> {
    return this.http.post<void>(this.api.apiUrl(`/api/report-templates/${id}/favourite`), {});
  }

  removeFavourite(id: number): Observable<void> {
    return this.http.delete<void>(this.api.apiUrl(`/api/report-templates/${id}/favourite`));
  }

  getRecentlyUsed(): Observable<number[]> {
    return this.http.get<number[]>(this.api.apiUrl('/api/report-templates/recently-used'));
  }

  // ── RLS Policies ─────────────────────────────────────────────────────────

  getRlsPolicies(templateId: number): Observable<RlsPolicy[]> {
    return this.http.get<RlsPolicy[]>(this.api.apiUrl(`/api/report-templates/${templateId}/rls-policies`));
  }

  addRlsPolicy(templateId: number, data: SaveRlsPolicyRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.api.apiUrl(`/api/report-templates/${templateId}/rls-policies`), data);
  }

  updateRlsPolicy(templateId: number, policyId: number, data: SaveRlsPolicyRequest): Observable<void> {
    return this.http.put<void>(this.api.apiUrl(`/api/report-templates/${templateId}/rls-policies/${policyId}`), data);
  }

  deleteRlsPolicy(templateId: number, policyId: number): Observable<void> {
    return this.http.delete<void>(this.api.apiUrl(`/api/report-templates/${templateId}/rls-policies/${policyId}`));
  }
}
