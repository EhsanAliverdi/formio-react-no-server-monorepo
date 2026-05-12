import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Notification, AdminNotification, NotificationsResult } from '../models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  unreadCount = signal<number>(0);

  list(params?: any): Observable<NotificationsResult> {
    let httpParams = new HttpParams();
    if (params) {
      for (const key of Object.keys(params)) {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, String(params[key]));
        }
      }
    }
    return this.http.get<NotificationsResult>(
      this.api.apiUrl('/api/notifications'),
      { params: httpParams }
    );
  }

  markRead(id: number): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(
      this.api.apiUrl(`/api/notifications/${id}/read`),
      {}
    ).pipe(
      tap(() => this.refreshUnreadCount())
    );
  }

  refreshUnreadCount(): void {
    this.list({ limit: 1 }).subscribe({
      next: res => this.unreadCount.set(res.unread_count),
      error: () => {}
    });
  }

  adminList(params?: any): Observable<{ items: AdminNotification[]; limit: number; offset: number }> {
    let httpParams = new HttpParams();
    if (params) {
      for (const key of Object.keys(params)) {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, String(params[key]));
        }
      }
    }
    return this.http.get<{ items: AdminNotification[]; limit: number; offset: number }>(
      this.api.apiUrl('/api/admin/notifications'),
      { params: httpParams }
    );
  }

  adminCreate(data: any): Observable<any> {
    return this.http.post<any>(this.api.apiUrl('/api/admin/notifications'), data);
  }
}
