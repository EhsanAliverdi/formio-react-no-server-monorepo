import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { SiteSettings } from '../models';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  getSiteSettings(): Observable<SiteSettings> {
    return this.http.get<SiteSettings>(this.api.apiUrl('/api/settings/site'));
  }

  updateSiteSettings(data: Partial<SiteSettings>): Observable<SiteSettings> {
    return this.http.put<SiteSettings>(
      this.api.apiUrl('/api/admin/settings/site'),
      data
    );
  }
}
