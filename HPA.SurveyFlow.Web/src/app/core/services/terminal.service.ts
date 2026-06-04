import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Terminal } from '../models';

@Injectable({ providedIn: 'root' })
export class TerminalService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(): Observable<Terminal[]> {
    return this.http.get<Terminal[]>(this.api.apiUrl('/api/terminals'));
  }
}
