import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class IconService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  getPacks(): Observable<{ items: { id: string; label: string }[] }> {
    return this.http.get<{ items: { id: string; label: string }[] }>(
      this.api.apiUrl('/api/icons/packs')
    );
  }

  search(pack: string, q?: string, limit?: number): Observable<{ items: string[] }> {
    let params = new HttpParams().set('pack', pack);
    if (q !== undefined) {
      params = params.set('q', q);
    }
    if (limit !== undefined) {
      params = params.set('limit', String(limit));
    }
    return this.http.get<{ items: string[] }>(
      this.api.apiUrl('/api/icons/search'),
      { params }
    );
  }

  getSvgUrl(pack: string, name: string): string {
    const params = new HttpParams().set('pack', pack).set('name', name);
    return `${environment.apiBaseUrl}/api/icons/svg?${params.toString()}`;
  }
}
