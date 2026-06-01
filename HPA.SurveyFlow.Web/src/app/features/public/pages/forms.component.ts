import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormService } from '../../../core/services/form.service';
import { Form } from '../../../core/models';

@Component({
  selector: 'app-forms',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="w-full">
      <div class="flex items-center justify-between mb-6">
        <div class="text-sm text-gray-600">{{ forms().length }} total</div>
      </div>

      @if (loading()) {
        <div class="text-gray-500">Loading…</div>
      } @else if (forms().length === 0) {
        <div class="text-gray-500">No forms available.</div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (f of formCards(); track f.id) {
            <div class="w-full bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
              <!-- Icon area -->
              <div class="w-full h-40 rounded-xl mb-6 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center">
                <svg class="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-3 mb-4">
                  <span class="inline-flex items-center rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                    {{ f.questions }} questions
                  </span>
                </div>
                <div class="text-xl text-gray-900 font-semibold">{{ f.name }}</div>
                @if (f.description) {
                  <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">{{ f.description }}</div>
                }
                <div class="flex items-center justify-end mt-6">
                  <button
                    class="inline-flex items-center text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm px-3 py-2"
                    [routerLink]="['/forms', f.id, 'fill']"
                  >
                    Start Form
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class FormsComponent implements OnInit {
  private formService = inject(FormService);

  forms = signal<Form[]>([]);
  loading = signal(true);

  formCards = computed(() =>
    this.forms().map(f => {
      const schema = this.parseJson(f.json);
      return {
        id: f.id,
        name: f.name,
        questions: this.countQuestions(schema),
        description: this.getDescription(schema),
      };
    })
  );

  ngOnInit(): void {
    this.loadForms();
  }

  loadForms(): void {
    this.loading.set(true);
    this.formService.list('public').subscribe({
      next: (forms) => {
        this.forms.set(forms);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  parseJson(json: any): any {
    if (typeof json === 'string') {
      try { return JSON.parse(json); } catch { return null; }
    }
    return json;
  }

  countQuestions(schema: any): number {
    if (!schema) return 0;
    const components: any[] = schema.components || [];
    return components.filter((c: any) => c.type !== 'button').length;
  }

  getDescription(schema: any): string | null {
    return schema?.appSettings?.publicDescription || null;
  }
}
