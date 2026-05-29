import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiKey, CreateApiKeyRequest, CreateApiKeyResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiKeyService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(): Observable<ApiKey[]> {
    return this.http.get<ApiKey[]>(this.api.apiUrl('/api/api-keys'));
  }

  create(data: CreateApiKeyRequest): Observable<CreateApiKeyResponse> {
    return this.http.post<CreateApiKeyResponse>(this.api.apiUrl('/api/api-keys'), data);
  }

  revoke(id: number): Observable<void> {
    return this.http.delete<void>(this.api.apiUrl(`/api/api-keys/${id}`));
  }
}
