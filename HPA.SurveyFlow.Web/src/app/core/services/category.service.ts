import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Category } from '../models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(): Observable<Category[]> {
    return this.http.get<Category[]>(this.api.apiUrl('/api/categories'));
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
