import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Category, PaginatedResult } from '../models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(): Observable<Category[]> {
    return this.http.get<Category[]>(this.api.apiUrl('/api/categories'));
  }

  listPaged(options: { limit?: number; offset?: number } = {}): Observable<PaginatedResult<Category>> {
    let params = new HttpParams().set('paged', true);
    if (options.limit != null) params = params.set('limit', options.limit);
    if (options.offset != null) params = params.set('offset', options.offset);
    return this.http.get<PaginatedResult<Category>>(this.api.apiUrl('/api/categories'), { params });
  }

  get(slug: string): Observable<Category> {
    return this.http.get<Category>(this.api.apiUrl(`/api/categories/${slug}`));
  }

  create(data: Partial<Category>): Observable<{ success: boolean; id: number; slug: string }> {
    return this.http.post<{ success: boolean; id: number; slug: string }>(
      this.api.apiUrl('/api/categories'), data
    );
  }

  update(slug: string, data: Partial<Category>): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(
      this.api.apiUrl(`/api/categories/${slug}`), data
    );
  }

  delete(slug: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(this.api.apiUrl(`/api/categories/${slug}`));
  }
}
