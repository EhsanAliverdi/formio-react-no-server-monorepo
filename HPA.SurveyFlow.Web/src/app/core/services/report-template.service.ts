import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  FieldDescriptor,
  ReportTemplate,
  SaveReportTemplateRequest,
  RunReportRequest,
  ReportExecutionResult,
  ConditionGroup,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ReportTemplateService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(formId?: number): Observable<ReportTemplate[]> {
    let params = new HttpParams();
    if (formId != null) params = params.set('formId', formId);
    return this.http.get<ReportTemplate[]>(this.api.apiUrl('/api/report-templates'), { params });
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
}
