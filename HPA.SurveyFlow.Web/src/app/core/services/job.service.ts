import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ScheduledJob, JobRun, PaginatedResult } from '../models';

@Injectable({ providedIn: 'root' })
export class JobService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  getJobs(): Observable<ScheduledJob[]> {
    return this.http.get<ScheduledJob[]>(this.api.apiUrl('/api/admin/jobs'));
  }

  getJobRuns(jobKey: string, limit = 50, offset = 0): Observable<PaginatedResult<JobRun>> {
    const params = new HttpParams().set('limit', limit).set('offset', offset);
    return this.http.get<PaginatedResult<JobRun>>(
      this.api.apiUrl(`/api/admin/jobs/${jobKey}/runs`), { params });
  }

  getAllRuns(limit = 50, offset = 0): Observable<PaginatedResult<JobRun>> {
    const params = new HttpParams().set('limit', limit).set('offset', offset);
    return this.http.get<PaginatedResult<JobRun>>(
      this.api.apiUrl('/api/admin/jobs/runs'), { params });
  }

  interruptJob(jobKey: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(this.api.apiUrl(`/api/admin/jobs/${jobKey}/interrupt`), {});
  }

  triggerJob(jobKey: string, params?: import('../models').TriggerJobParams): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      this.api.apiUrl(`/api/admin/jobs/${jobKey}/trigger`), params ?? {});
  }

  updateJob(jobKey: string, data: {
    cron_expression?: string;
    is_enabled?: boolean;
    description?: string;
    sync_mode?: string;
    only_update_changed?: boolean;
  }): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(
      this.api.apiUrl(`/api/admin/jobs/${jobKey}`),
      {
        cronExpression:     data.cron_expression,
        isEnabled:          data.is_enabled,
        description:        data.description,
        syncMode:           data.sync_mode,
        onlyUpdateChanged:  data.only_update_changed,
      });
  }

  getAssets(source = 'mex', q?: string, limit = 200): Observable<{ value: string; label: string; category?: string; location?: string }[]> {
    let params = new HttpParams().set('source', source).set('limit', limit);
    if (q) params = params.set('q', q);
    return this.http.get<any[]>(this.api.apiUrl('/api/data-sources/assets'), { params });
  }

  getAdminAssets(opts: {
    source?: string; q?: string; isActive?: boolean; category?: string; limit?: number; offset?: number;
  } = {}): Observable<{
    items: ExternalAsset[]; total: number; limit: number; offset: number;
    sources: { source: string; count: number; last_synced_at: string }[];
    categories: string[];
  }> {
    let params = new HttpParams();
    if (opts.source) params = params.set('source', opts.source);
    if (opts.q) params = params.set('q', opts.q);
    if (opts.isActive !== undefined) params = params.set('isActive', String(opts.isActive));
    if (opts.category) params = params.set('category', opts.category);
    if (opts.limit !== undefined) params = params.set('limit', opts.limit);
    if (opts.offset !== undefined) params = params.set('offset', opts.offset);
    return this.http.get<any>(this.api.apiUrl('/api/admin/assets'), { params });
  }

  getAdminAsset(id: number): Observable<ExternalAsset & { raw?: any }> {
    return this.http.get<any>(this.api.apiUrl(`/api/admin/assets/${id}`));
  }

  bestEffortSync(): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(this.api.apiUrl('/api/admin/assets/best-effort-sync'), {});
  }

  syncOneAsset(externalId: string): Observable<{
    success: boolean;
    requested_id: string;
    total_synced: number;
    records: { external_id: string; display_name?: string; status: string; saved: boolean; error?: string }[];
  }> {
    return this.http.post<any>(this.api.apiUrl('/api/admin/assets/sync-one'), { externalId });
  }

  getAssetTree(opts: {
    source?: string; q?: string; isActive?: boolean; category?: string;
  } = {}): Observable<{
    nodes: AssetTreeNode[];
    total: number;
    sources: { source: string; count: number; last_synced_at: string }[];
    categories: string[];
  }> {
    let params = new HttpParams();
    if (opts.source)   params = params.set('source',   opts.source);
    if (opts.q)        params = params.set('q',         opts.q);
    if (opts.isActive !== undefined) params = params.set('isActive', String(opts.isActive));
    if (opts.category) params = params.set('category',  opts.category);
    return this.http.get<any>(this.api.apiUrl('/api/admin/assets/tree'), { params });
  }
}

export interface AssetTreeNode extends ExternalAsset {
  depth: number;
  has_children: boolean;
  child_count: number;
  is_match: boolean;
}

export interface ExternalAsset {
  id: number;
  source: string;
  external_id: string;
  parent_external_id?: string | null;
  display_name: string;
  category?: string;
  location?: string;
  is_active: boolean;
  last_synced_at: string;
  source_modified_at?: string | null;
  raw?: any;
}
