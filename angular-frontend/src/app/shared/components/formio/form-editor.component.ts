import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormioModule } from '@formio/angular';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-form-editor',
  standalone: true,
  imports: [CommonModule, FormioModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="formio-scope">
      <formio-builder
        [form]="formSchema"
        (change)="onBuilderChange($event)"
        [options]="builderOptions"
      />
    </div>
  `,
})
export class FormEditorComponent implements OnChanges {
  @Input() formSchema: any = {};
  @Input() apiBaseUrl: string = '';
  @Output() formSaved = new EventEmitter<any>();

  private api = inject(ApiService);

  private currentSchema: any = {};
  builderOptions: any = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['formSchema'] || changes['apiBaseUrl']) {
      this.buildOptions();
    }
    if (changes['formSchema'] && this.formSchema) {
      this.currentSchema = this.formSchema;
    }
  }

  private buildOptions(): void {
    const base = this.apiBaseUrl || this.api.apiUrl('');
    const token = localStorage.getItem('authToken') || '';
    this.builderOptions = {
      builder: {
        basic: true,
        advanced: true,
        data: true,
        premium: false,
      },
      fileService: {
        uploadFile: (file: File) => {
          const formData = new FormData();
          formData.append('file', file);
          return fetch(`${base}/api/uploads`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          }).then(r => r.json());
        },
      },
    };
  }

  onBuilderChange(event: any): void {
    if (event && event.form) {
      this.currentSchema = event.form;
    } else if (event && typeof event === 'object' && event.components !== undefined) {
      this.currentSchema = event;
    }
  }

  getSchema(): any {
    return this.currentSchema;
  }

  save(): void {
    this.formSaved.emit(this.currentSchema);
  }
}
