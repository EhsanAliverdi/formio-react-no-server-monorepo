import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiKeyService } from '../../../core/services/api-key.service';
import { ApiKey, CreateApiKeyResponse } from '../../../core/models';

@Component({
  selector: 'app-api-keys',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">API Keys</h1>
          <p class="text-sm text-gray-500 mt-1">Manage programmatic access to the API</p>
        </div>
        <button
          class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition"
          (click)="openCreate()"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Key
        </button>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        @if (loading()) {
          <div class="p-8 text-center text-gray-400">Loading…</div>
        } @else if (keys().length === 0) {
          <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 class="text-sm font-semibold text-gray-900 mb-1">No API keys yet</h3>
            <p class="text-sm text-gray-500 mb-4 max-w-xs">API keys let external tools and integrations access SurveyFlow data programmatically.</p>
            <button
              class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition"
              (click)="openCreate()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Create API Key
            </button>
          </div>
        } @else {
          <div class="overflow-x-auto">
          <table class="min-w-[640px] w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th scope="col" class="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th scope="col" class="text-left px-4 py-3 font-medium text-gray-600">Prefix</th>
                <th scope="col" class="text-left px-4 py-3 font-medium text-gray-600">Scopes</th>
                <th scope="col" class="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th scope="col" class="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                <th scope="col" class="text-left px-4 py-3 font-medium text-gray-600">Last Used</th>
                <th scope="col" class="text-left px-4 py-3 font-medium text-gray-600">Expires</th>
                <th scope="col" class="px-4 py-3"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (key of keys(); track key.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 font-medium text-gray-900">{{ key.name }}</td>
                  <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ key.prefix }}…</td>
                  <td class="px-4 py-3 text-gray-600 text-xs">{{ key.scopes || 'all' }}</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex px-2 py-0.5 rounded text-xs font-medium"
                          [class]="key.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
                      {{ key.is_active ? 'Active' : 'Revoked' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-500 text-xs">{{ key.created_at | date:'dd/MM/yy' }}</td>
                  <td class="px-4 py-3 text-gray-500 text-xs">{{ key.last_used_at ? (key.last_used_at | date:'dd/MM/yy') : '—' }}</td>
                  <td class="px-4 py-3 text-gray-500 text-xs">{{ key.expires_at ? (key.expires_at | date:'dd/MM/yy') : '—' }}</td>
                  <td class="px-4 py-3 text-right">
                    @if (key.is_active) {
                      <button
                        class="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition"
                        (click)="revoke(key)"
                      >Revoke</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
          </div>
        }
      </div>
    </div>

    <!-- Create modal -->
    @if (showCreate()) {
      <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
          <h2 class="text-lg font-semibold">Create API Key</h2>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input class="w-full input" placeholder="e.g. CI/CD Pipeline" [(ngModel)]="form.name" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Scopes</label>
            <input class="w-full input" placeholder="Comma-separated permissions (blank = all)" [(ngModel)]="form.scopes" />
            <p class="text-xs text-gray-500 mt-1">Leave blank to grant all permissions</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
            <input type="date" class="w-full input" [(ngModel)]="form.expiresAt" />
          </div>
          @if (createError()) {
            <p class="text-sm text-red-600">{{ createError() }}</p>
          }
          <div class="flex gap-3 justify-end pt-2">
            <button class="btn btn-ghost" (click)="closeCreate()">Cancel</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="create()">
              {{ saving() ? 'Creating…' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Show key modal (once only) -->
    @if (newKey()) {
      <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
          <h2 class="text-lg font-semibold text-green-700">Key Created Successfully</h2>
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p class="text-sm font-medium text-amber-800 mb-2">⚠ Copy this key now — it will not be shown again.</p>
            <div class="flex items-center gap-2">
              <code class="flex-1 font-mono text-sm bg-white border border-amber-200 rounded px-3 py-2 break-all">{{ newKey()!.key }}</code>
              <button class="btn btn-xs btn-outline" (click)="copyKey()">Copy</button>
            </div>
          </div>
          <dl class="grid grid-cols-2 gap-2 text-sm">
            <dt class="text-gray-500">Name</dt><dd>{{ newKey()!.name }}</dd>
            <dt class="text-gray-500">Prefix</dt><dd class="font-mono">{{ newKey()!.prefix }}</dd>
            <dt class="text-gray-500">Scopes</dt><dd>{{ newKey()!.scopes || 'all' }}</dd>
          </dl>
          <div class="flex justify-end">
            <button class="btn btn-primary" (click)="newKey.set(null)">Done</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ApiKeysComponent implements OnInit {
  private svc = inject(ApiKeyService);

  loading = signal(false);
  keys = signal<ApiKey[]>([]);
  showCreate = signal(false);
  saving = signal(false);
  createError = signal('');
  newKey = signal<CreateApiKeyResponse | null>(null);

  form = { name: '', scopes: '', expiresAt: '' };

  ngOnInit() { this.fetchKeys(); }

  private fetchKeys() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: k => { this.keys.set(k); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.form = { name: '', scopes: '', expiresAt: '' };
    this.createError.set('');
    this.showCreate.set(true);
  }

  closeCreate() { this.showCreate.set(false); }

  create() {
    if (!this.form.name.trim()) { this.createError.set('Name is required.'); return; }
    this.saving.set(true);
    this.createError.set('');
    this.svc.create({
      name: this.form.name.trim(),
      scopes: this.form.scopes.trim() || null,
      expires_at: this.form.expiresAt || null,
    }).subscribe({
      next: res => {
        this.saving.set(false);
        this.showCreate.set(false);
        this.newKey.set(res);
        this.fetchKeys();
      },
      error: () => { this.saving.set(false); this.createError.set('Failed to create API key.'); },
    });
  }

  revoke(key: ApiKey) {
    if (!confirm(`Revoke key "${key.name}"? This cannot be undone.`)) return;
    this.svc.revoke(key.id).subscribe(() => this.fetchKeys());
  }

  copyKey() {
    const k = this.newKey()?.key;
    if (k) navigator.clipboard.writeText(k).catch(() => {});
  }
}
