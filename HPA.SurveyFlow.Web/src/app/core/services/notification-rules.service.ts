import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { NotificationRule, SaveNotificationRuleRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class NotificationRulesService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(formId: number): Observable<NotificationRule[]> {
    return this.http.get<NotificationRule[]>(this.api.apiUrl(`/api/forms/${formId}/notification-rules`));
  }

  get(formId: number, id: number): Observable<NotificationRule> {
    return this.http.get<NotificationRule>(this.api.apiUrl(`/api/forms/${formId}/notification-rules/${id}`));
  }

  create(formId: number, data: SaveNotificationRuleRequest): Observable<NotificationRule> {
    return this.http.post<NotificationRule>(this.api.apiUrl(`/api/forms/${formId}/notification-rules`), data);
  }

  update(formId: number, id: number, data: SaveNotificationRuleRequest): Observable<NotificationRule> {
    return this.http.put<NotificationRule>(this.api.apiUrl(`/api/forms/${formId}/notification-rules/${id}`), data);
  }

  delete(formId: number, id: number): Observable<void> {
    return this.http.delete<void>(this.api.apiUrl(`/api/forms/${formId}/notification-rules/${id}`));
  }

  reorder(formId: number, orderedIds: number[]): Observable<void> {
    return this.http.put<void>(this.api.apiUrl(`/api/forms/${formId}/notification-rules/reorder`), orderedIds);
  }
}
