import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { IntegrationRule, SaveIntegrationRuleRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class IntegrationRulesService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(formId: number): Observable<IntegrationRule[]> {
    return this.http.get<IntegrationRule[]>(this.api.apiUrl(`/api/forms/${formId}/integration-rules`));
  }

  get(formId: number, id: number): Observable<IntegrationRule> {
    return this.http.get<IntegrationRule>(this.api.apiUrl(`/api/forms/${formId}/integration-rules/${id}`));
  }

  create(formId: number, data: SaveIntegrationRuleRequest): Observable<IntegrationRule> {
    return this.http.post<IntegrationRule>(this.api.apiUrl(`/api/forms/${formId}/integration-rules`), data);
  }

  update(formId: number, id: number, data: SaveIntegrationRuleRequest): Observable<IntegrationRule> {
    return this.http.put<IntegrationRule>(this.api.apiUrl(`/api/forms/${formId}/integration-rules/${id}`), data);
  }

  delete(formId: number, id: number): Observable<void> {
    return this.http.delete<void>(this.api.apiUrl(`/api/forms/${formId}/integration-rules/${id}`));
  }

  reorder(formId: number, orderedIds: number[]): Observable<void> {
    return this.http.put<void>(this.api.apiUrl(`/api/forms/${formId}/integration-rules/reorder`), orderedIds);
  }
}
