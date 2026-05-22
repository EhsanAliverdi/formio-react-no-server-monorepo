import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  signal,
  computed,
  inject,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';
import { Formio } from 'formiojs';
import { FormService } from '../../../core/services/form.service';
import { Form } from '../../../core/models';
import { patchSchemaUrls } from '../../../core/utils/schema-patch';

type Panel = { key: string; title: string; label: string; breadcrumb: string; components: any[] };

function isPanel(c: any): c is Panel {
  return c?.type === 'panel' && Array.isArray(c.components);
}

function getPanels(schema: any): Panel[] {
  return (Array.isArray(schema?.components) ? schema.components : []).filter(isPanel);
}

function panelTitle(p: Panel, i: number): string {
  return (p as any).breadcrumb || p.title || (p as any).label || p.key || `Step ${i + 1}`;
}

@Component({
  selector: 'app-admin-form-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <div class="flex items-center gap-3 mb-6">
        <button type="button" (click)="router.navigate(['/admin/forms'])"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <h1 class="text-2xl font-bold text-gray-900">
          @if (form()) { {{ form()!.name }} } @else { View Form }
        </h1>
      </div>

      @if (loading()) {
        <div class="flex justify-center items-center py-16">
          <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }

      @if (error()) {
        <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {{ error() }}
        </div>
      }

      @if (!loading() && form()) {
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          @if (publicDescription()) {
            <p class="text-sm text-gray-600 mb-4">{{ publicDescription() }}</p>
          }

          @if (isWizard() && panels().length > 1) {
            <div class="mb-4 flex flex-wrap gap-2">
              @for (panel of panels(); track panel.key; let i = $index) {
                <div class="inline-flex items-center rounded-full border px-3 py-1 text-sm"
                  [class]="step() === i
                    ? 'border-blue-200 bg-blue-50 font-semibold text-blue-700'
                    : i < step()
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-500'">
                  {{ i + 1 }}. {{ panelTitle(panel, i) }}
                </div>
              }
            </div>
          }

          <div class="formio-scope" [class.flowbite-stepper-wizard]="isWizard()">
            <div #formContainer></div>
          </div>

          @if (isWizard() && panels().length > 1) {
            <div class="mt-4 flex gap-3">
              @if (step() > 0) {
                <button type="button" (click)="prevStep()"
                  class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition">
                  Previous
                </button>
              }
              @if (step() < panels().length - 1) {
                <button type="button" (click)="nextStep()"
                  class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition">
                  Next
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class FormViewComponent implements OnInit, OnDestroy {
  @ViewChild('formContainer', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  router = inject(Router);
  private route = inject(ActivatedRoute);
  private formService = inject(FormService);
  private zone = inject(NgZone);

  form = signal<Form | null>(null);
  schema = signal<any>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  step = signal(0);

  panels = computed<Panel[]>(() => getPanels(this.schema()));
  isWizard = computed(() => this.schema()?.display === 'wizard' || this.panels().length > 0);
  publicDescription = computed(() => this.schema()?.appSettings?.publicDescription?.trim() || null);
  panelTitle = panelTitle;

  private formInstance: any = null;

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('id');
    if (!idStr) {
      this.error.set('No form ID provided.');
      this.loading.set(false);
      return;
    }

    this.formService.get(Number(idStr)).subscribe({
      next: (f) => {
        let schema = f.json;
        if (typeof schema === 'string') {
          try { schema = JSON.parse(schema); } catch { schema = null; }
        }
        schema = patchSchemaUrls(schema, (window as any).__SURVEYFLOW_API_BASE__ ?? '');
        this.form.set(f);
        this.schema.set(schema);
        this.loading.set(false);
        this.zone.onStable.pipe(take(1)).subscribe(() => requestAnimationFrame(() => this.mountForm()));
      },
      error: (err) => {
        this.error.set(err?.error?.error || 'Failed to load form.');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.formInstance?.destroy?.(true);
    this.formInstance = null;
  }

  nextStep(): void {
    if (this.step() < this.panels().length - 1) {
      this.step.update(s => s + 1);
      setTimeout(() => this.mountForm(), 0);
    }
  }

  prevStep(): void {
    if (this.step() > 0) {
      this.step.update(s => s - 1);
      setTimeout(() => this.mountForm(), 0);
    }
  }

  private mountForm(): void {
    if (!this.schema() || !this.containerRef?.nativeElement) {
      requestAnimationFrame(() => this.mountForm());
      return;
    }

    this.formInstance?.destroy?.(true);
    this.containerRef.nativeElement.innerHTML = '';

    const schema = structuredClone(this.schema());
    if (this.isWizard() && this.panels().length > 0) {
      schema.components = [this.panels()[this.step()]];
      schema.display = 'form';
    }

    Formio.createForm(this.containerRef.nativeElement, schema, {
      readOnly: true,
      noDefaultSubmitButton: true,
    }).then((instance: any) => {
      this.formInstance = instance;
      instance.disabled = true;
    });
  }
}
