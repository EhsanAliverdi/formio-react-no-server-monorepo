import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Dataset, PaginatedResult, SaveDatasetRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class DatasetService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(formId?: number, terminalCode?: string | null): Observable<Dataset[]> {
    return this.listPaged({ formId, terminal_code: terminalCode }).pipe(map(result => result.items));
  }

  listPaged(options: { formId?: number; terminal_code?: string | null; limit?: number; offset?: number } = {}): Observable<PaginatedResult<Dataset>> {
    let params = new HttpParams();
    if (options.formId != null) params = params.set('formId', options.formId);
    if (options.terminal_code) params = params.set('terminal_code', options.terminal_code);
    if (options.limit != null) params = params.set('limit', options.limit);
    if (options.offset != null) params = params.set('offset', options.offset);
    return this.http.get<PaginatedResult<Dataset>>(this.api.apiUrl('/api/datasets'), { params });
  }

  get(id: number): Observable<Dataset> {
    return this.http.get<Dataset>(this.api.apiUrl(`/api/datasets/${id}`));
  }

  create(data: SaveDatasetRequest): Observable<Dataset> {
    return this.http.post<Dataset>(this.api.apiUrl('/api/datasets'), data);
  }

  update(id: number, data: SaveDatasetRequest): Observable<Dataset> {
    return this.http.put<Dataset>(this.api.apiUrl(`/api/datasets/${id}`), data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(this.api.apiUrl(`/api/datasets/${id}`));
  }
}
