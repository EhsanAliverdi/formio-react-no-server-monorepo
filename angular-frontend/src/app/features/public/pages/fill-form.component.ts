import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { FormService } from '../../../core/services/form.service';
import { FormRendererComponent } from '../../../shared/components/formio/form-renderer.component';

@Component({
  selector: 'app-fill-form',
  standalone: true,
  imports: [CommonModule, RouterLink, FormRendererComponent],
  template: `
    <div class="w-full bg-white p-4 rounded-lg border border-gray-200">
      <div class="flex items-center justify-between mb-4">
        <div class="min-w-0">
          <h1 class="text-2xl font-bold">{{ formTitle() }}</h1>
          @if (publicDescription()) {
            <div class="mt-1 text-sm text-gray-600">{{ publicDescription() }}</div>
          }
        </div>
        <a
          routerLink="/forms"
          class="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shrink-0 ml-4"
        >Back to Forms</a>
      </div>

      @if (loading()) {
        <div class="text-gray-500">Loading form...</div>
      } @else if (form()) {
        <div class="formio-scope">
          <app-form-renderer [form]="form()" (submitted)="onSubmit($event)" />
        </div>
      } @else {
        <div class="rounded-lg border border-gray-200 bg-white p-4 text-gray-700">This form is not available.</div>
      }
    </div>
  `,
})
export class FillFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private formService = inject(FormService);
  private toastr = inject(ToastrService);

  form = signal<any>(null);
  loading = signal(true);
  submitting = signal(false);
  formName = signal<string | null>(null);

  formTitle = computed(() => this.form()?.title || this.form()?.name || this.formName() || 'Fill Form');
  publicDescription = computed(() => this.form()?.appSettings?.publicDescription?.trim() || null);

  private formId!: number;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.formId = +id;
    this.loadForm();
  }

  loadForm(): void {
    this.loading.set(true);
    this.formService.get(this.formId, 'public').subscribe({
      next: (res) => {
        this.formName.set(res.name);
        // Parse json if it's a string
        let schema = res.json;
        if (typeof schema === 'string') {
          try { schema = JSON.parse(schema); } catch { schema = null; }
        }
        this.form.set(schema);
        this.loading.set(false);
      },
      error: () => {
        this.form.set(null);
        this.loading.set(false);
      },
    });
  }

  onSubmit(event: any): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    const data = event?.data ?? event;
    this.formService.submit(this.formId, data).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toastr.success('Form submitted successfully!');
        this.router.navigate(['/forms/mysubmissions']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toastr.error(err?.error?.message || 'Failed to submit form.');
      },
    });
  }
}
