import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Dataset, SaveDatasetRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class DatasetService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(formId?: number): Observable<Dataset[]> {
    let params = new HttpParams();
    if (formId != null) params = params.set('formId', formId);
    return this.http.get<Dataset[]>(this.api.apiUrl('/api/datasets'), { params });
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
