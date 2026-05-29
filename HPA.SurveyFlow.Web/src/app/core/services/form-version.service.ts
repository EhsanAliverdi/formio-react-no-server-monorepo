import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FormVersion } from '../models';

@Injectable({ providedIn: 'root' })
export class FormVersionService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  list(formId: number): Observable<FormVersion[]> {
    return this.http.get<FormVersion[]>(this.api.apiUrl(`/api/forms/${formId}/versions`));
  }

  get(formId: number, versionNumber: number): Observable<FormVersion> {
    return this.http.get<FormVersion>(this.api.apiUrl(`/api/forms/${formId}/versions/${versionNumber}`));
  }

  restore(formId: number, versionNumber: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      this.api.apiUrl(`/api/forms/${formId}/versions/${versionNumber}/restore`), {}
    );
  }
}
