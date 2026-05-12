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

@Component({
  selector: 'app-form-renderer',
  standalone: true,
  imports: [CommonModule, FormioModule],
  template: `
    <div class="formio-scope">
      <formio
        [form]="form"
        [submission]="submission ? { data: submission } : undefined"
        [options]="formioOptions"
        (submit)="onSubmit($event)"
      />
    </div>
  `,
})
export class FormRendererComponent implements OnChanges {
  @Input() form: any = {};
  @Input() submission: any = null;
  @Input() readOnly: boolean = false;
  @Output() submitted = new EventEmitter<any>();

  formioOptions: any = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['readOnly']) {
      this.formioOptions = {
        ...this.formioOptions,
        readOnly: this.readOnly,
        viewAsHtml: this.readOnly,
      };
    }
  }

  onSubmit(event: any): void {
    this.submitted.emit(event);
  }
}
