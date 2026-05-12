import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User } from '../models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(params?: any): Observable<User[]> {
    let httpParams = new HttpParams();
    if (params) {
      for (const key of Object.keys(params)) {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, String(params[key]));
        }
      }
    }
    return this.http.get<User[]>(this.api.apiUrl('/api/users'), { params: httpParams });
  }

  get(id: number): Observable<User> {
    return this.http.get<User>(this.api.apiUrl(`/api/users/${id}`));
  }

  getMe(): Observable<User> {
    return this.http.get<User>(this.api.apiUrl('/api/users/me'));
  }

  create(data: any): Observable<{ success: boolean; id: number }> {
    return this.http.post<{ success: boolean; id: number }>(
      this.api.apiUrl('/api/users'),
      data
    );
  }

  update(id: number, data: any): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(
      this.api.apiUrl(`/api/users/${id}`),
      data
    );
  }

  delete(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(this.api.apiUrl(`/api/users/${id}`));
  }

  updateMe(data: any): Observable<{ success: boolean; user: User }> {
    return this.http.put<{ success: boolean; user: User }>(
      this.api.apiUrl('/api/users/me'),
      data
    );
  }

  uploadAvatar(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post<any>(this.api.apiUrl('/api/users/me/avatar'), formData);
  }

  uploadAvatarForUser(id: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post<any>(this.api.apiUrl(`/api/users/${id}/avatar`), formData);
  }
}
