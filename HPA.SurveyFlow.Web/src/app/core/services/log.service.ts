import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  correlation_id?: string;
  exception?: string;
  raw?: string;
}

@Injectable({ providedIn: 'root' })
export class LogService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  getLogs(opts: { level?: string; q?: string; limit?: number; date?: string } = {}):
    Observable<{ items: LogEntry[]; log_file: string }> {
    let params = new HttpParams();
    if (opts.level) params = params.set('level', opts.level);
    if (opts.q) params = params.set('q', opts.q);
    if (opts.limit) params = params.set('limit', opts.limit);
    if (opts.date) params = params.set('date', opts.date);
    return this.http.get<any>(this.api.apiUrl('/api/logs'), { params });
  }

  getFiles(): Observable<{ files: { name: string; date: string; size_bytes: number }[] }> {
    return this.http.get<any>(this.api.apiUrl('/api/logs/files'));
  }
}
