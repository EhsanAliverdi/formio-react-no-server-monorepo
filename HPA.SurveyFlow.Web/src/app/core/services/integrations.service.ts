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
    return this.http.get<Integrations>(this.api.apiUrl('/api/integrations'));
  }

  updateIntegrations(data: object): Observable<Integrations> {
    return this.http.put<Integrations>(this.api.apiUrl('/api/integrations'), data);
  }

  testEmail(payload: object): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      this.api.apiUrl('/api/integrations/email/test'), payload
    );
  }

  testMex(payload: object): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      this.api.apiUrl('/api/integrations/mex/test'), payload
    );
  }

  testMexRequest(payload: object): Observable<{ success?: boolean; message?: string; requiresConfirmation?: boolean; environment?: string; error?: string }> {
    return this.http.post<any>(
      this.api.apiUrl('/api/integrations/mex/test-request'), payload
    );
  }
}
