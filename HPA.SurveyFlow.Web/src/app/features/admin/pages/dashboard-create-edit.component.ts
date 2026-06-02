import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DashboardVisibility, SaveDashboardRequest } from '../../../core/models';

@Component({
  selector: 'app-dashboard-create-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="mx-auto max-w-2xl">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ id ? 'Edit Dashboard' : 'New Dashboard' }}</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Define the dashboard page. Add report cards in the designer.</p>
      </div>
      @if (error()) { <div class="ta-alert-error mb-4">{{ error() }}</div> }
      <form class="ta-card space-y-4" (ngSubmit)="save()">
        <div>
          <label class="ta-field-label">Name</label>
          <input name="name" [(ngModel)]="form.name" class="ta-field" required />
        </div>
        <div>
          <label class="ta-field-label">Slug</label>
          <input name="slug" [(ngModel)]="form.slug" class="ta-field font-mono" placeholder="operations-overview" required />
          <p class="mt-1 text-xs text-gray-400">Public path: /reporting/d/{{ form.slug || 'slug' }}</p>
        </div>
        <div>
          <label class="ta-field-label">Description</label>
          <textarea name="description" [(ngModel)]="form.description" class="ta-field h-24 py-3" rows="3"></textarea>
        </div>
        <div>
          <label class="ta-field-label">Visibility</label>
          <select name="visibility" [(ngModel)]="form.visibility" class="ta-field">
            <option value="restricted">Restricted - sign in required</option>
            <option value="public">Public</option>
          </select>
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" name="isActive" [(ngModel)]="form.is_active" class="h-4 w-4 rounded border-gray-300 text-indigo-600" />
          Active
        </label>
        <div class="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          <a routerLink="/admin/reporting/dashboards" class="ta-btn ta-btn-secondary">Cancel</a>
          <button type="submit" [disabled]="saving()" class="ta-btn ta-btn-primary">{{ saving() ? 'Saving...' : 'Save Dashboard' }}</button>
        </div>
      </form>
    </div>
  `,
})
export class DashboardCreateEditComponent implements OnInit {
  private service = inject(DashboardService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  id = Number(this.route.snapshot.paramMap.get('id')) || 0;
  saving = signal(false);
  error = signal('');
  form: SaveDashboardRequest = { name: '', slug: '', description: '', visibility: 'restricted', is_active: true };

  ngOnInit(): void {
    if (!this.id) return;
    this.service.get(this.id).subscribe({
      next: dashboard => this.form = { name: dashboard.name, slug: dashboard.slug, description: dashboard.description, visibility: dashboard.visibility as DashboardVisibility, is_active: dashboard.is_active },
      error: () => this.error.set('Failed to load dashboard.'),
    });
  }

  save(): void {
    this.saving.set(true);
    this.error.set('');
    const request = this.id ? this.service.update(this.id, this.form) : this.service.create(this.form);
    request.subscribe({
      next: dashboard => this.router.navigate(['/admin/reporting/dashboards', dashboard.id, 'designer']),
      error: err => { this.error.set(err?.error?.error || 'Failed to save dashboard.'); this.saving.set(false); },
    });
  }
}
