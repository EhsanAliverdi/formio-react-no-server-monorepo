import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Integrations } from '../models';

@Injectable({ providedIn: 'root' })
export class IntegrationsService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  getIntegrations(): Observable<Integrations> {
    return this.http.get<Integrations>(this.api.apiUrl('/api/admin/settings/integrations'));
  }

  updateIntegrations(data: object): Observable<Integrations> {
    return this.http.put<Integrations>(this.api.apiUrl('/api/admin/settings/integrations'), data);
  }
}
