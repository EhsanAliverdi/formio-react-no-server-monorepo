import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiKey, CreateApiKeyRequest, CreateApiKeyResponse, PaginatedResult } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiKeyService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(): Observable<ApiKey[]> {
    return this.http.get<ApiKey[]>(this.api.apiUrl('/api/api-keys'));
  }

  listPaged(options: { limit?: number; offset?: number } = {}): Observable<PaginatedResult<ApiKey>> {
    let params = new HttpParams().set('paged', true);
    if (options.limit != null) params = params.set('limit', options.limit);
    if (options.offset != null) params = params.set('offset', options.offset);
    return this.http.get<PaginatedResult<ApiKey>>(this.api.apiUrl('/api/api-keys'), { params });
  }

  create(data: CreateApiKeyRequest): Observable<CreateApiKeyResponse> {
    return this.http.post<CreateApiKeyResponse>(this.api.apiUrl('/api/api-keys'), data);
  }

  revoke(id: number): Observable<void> {
    return this.http.delete<void>(this.api.apiUrl(`/api/api-keys/${id}`));
  }
}
