import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Page, SavePageRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class PageService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(): Observable<Page[]> {
    return this.http.get<Page[]>(this.api.apiUrl('/api/pages'));
  }

  get(id: number): Observable<Page> {
    return this.http.get<Page>(this.api.apiUrl(`/api/pages/${id}`));
  }

  getBySlug(slug: string): Observable<Page> {
    return this.http.get<Page>(this.api.apiUrl(`/api/pages/by-slug/${slug}`));
  }

  create(data: SavePageRequest): Observable<Page> {
    return this.http.post<Page>(this.api.apiUrl('/api/pages'), data);
  }

  update(id: number, data: SavePageRequest): Observable<Page> {
    return this.http.put<Page>(this.api.apiUrl(`/api/pages/${id}`), data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(this.api.apiUrl(`/api/pages/${id}`));
  }
}
