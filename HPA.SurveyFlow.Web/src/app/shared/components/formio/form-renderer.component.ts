import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormioModule } from '@formio/angular';
import { patchSchemaUrls } from '../../../core/utils/schema-patch';

@Component({
  selector: 'app-form-renderer',
  standalone: true,
  imports: [CommonModule, FormioModule],
  template: `
    <div class="formio-scope">
      <!-- Destroy and recreate the formio component whenever readOnly changes
           so the options are guaranteed to be applied before first render. -->
      @if (readOnly) {
        <formio
          [form]="form"
          [submission]="wrappedSubmission"
          [options]="readOnlyOptions"
        />
      } @else {
        <formio
          [form]="form"
          [submission]="wrappedSubmission"
          [options]="editOptions"
          (submit)="onSubmit($event)"
        />
      }
    </div>
  `,
})
export class FormRendererComponent implements OnChanges {
  @Input() set form(val: any) { this._form = patchSchemaUrls(val, (window as any).__SURVEYFLOW_API_BASE__ ?? ''); }
  get form(): any { return this._form; }
  private _form: any = {};

  @Input() submission: any = null;
  @Input() readOnly = false;
  @Output() submitted = new EventEmitter<any>();

  wrappedSubmission: any = undefined;

  readonly readOnlyOptions = { readOnly: true, viewAsHtml: true };
  readonly editOptions    = { readOnly: false };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['submission']) {
      this.wrappedSubmission = this.submission ? { data: this.submission } : undefined;
    }
  }

  onSubmit(event: any): void {
    this.submitted.emit(event);
  }
}
