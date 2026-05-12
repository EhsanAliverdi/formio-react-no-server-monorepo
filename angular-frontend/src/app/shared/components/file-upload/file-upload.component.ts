import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilePondModule, registerPlugin } from 'ngx-filepond';
import { FilePondOptions } from 'filepond';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import { UploadService } from '../../../core/services/upload.service';
import { ToastrService } from 'ngx-toastr';

registerPlugin(
  FilePondPluginImagePreview,
  FilePondPluginFileValidateType,
  FilePondPluginFileValidateSize
);

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, FilePondModule],
  template: `
    <file-pond
      #pond
      [options]="pondOptions"
      (oninit)="onPondInit()"
      (onaddfile)="onAddFile($event)"
      (onprocessfile)="onProcessFile($event)"
      (onerror)="onError($event)"
    />
  `,
})
export class FileUploadComponent implements OnInit {
  @Input() maxFileSize: string = '10MB';
  @Input() acceptedFileTypes: string[] = ['image/*'];
  @Input() label: string = 'Drop files here or click to browse';
  @Output() uploaded = new EventEmitter<{ url: string; key: string }>();

  @ViewChild('pond') pond: any;

  private uploadService = inject(UploadService);
  private toastr = inject(ToastrService);

  pondOptions: FilePondOptions = {};

  ngOnInit(): void {
    this.pondOptions = {
      allowMultiple: false,
      labelIdle: `<span class="filepond--label-action">${this.label}</span>`,
      maxFileSize: this.maxFileSize,
      acceptedFileTypes: this.acceptedFileTypes,
      server: {
        process: (fieldName, file, metadata, load, error, progress, abort) => {
          this.uploadService.upload(file as File).subscribe({
            next: (result) => {
              load(JSON.stringify(result));
              this.uploaded.emit({ url: result.url, key: result.key });
            },
            error: (err) => {
              const msg = err?.error?.error || 'Upload failed';
              error(msg);
              this.toastr.error(msg, 'Upload Error');
            },
          });
          return {
            abort: () => {
              abort();
            },
          };
        },
        load: null,
        revert: null,
        restore: null,
        fetch: null,
      },
    };
  }

  onPondInit(): void {}

  onAddFile(event: any): void {}

  onProcessFile(event: any): void {}

  onError(event: any): void {
    const msg = event?.error?.body || 'File processing error';
    this.toastr.error(msg, 'Upload Error');
  }
}
