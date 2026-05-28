import {
  Component, Input, Output, EventEmitter, ViewChild, ElementRef,
  AfterViewInit, OnChanges, SimpleChanges, HostListener, forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [CommonModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RichTextEditorComponent), multi: true }],
  template: `
    <!-- Toolbar -->
    <div class="flex items-center gap-1 flex-wrap p-2 border border-gray-300 border-b-0 rounded-t-lg bg-gray-50">
      <button type="button" (click)="exec('bold')"
        class="toolbar-btn" title="Bold"><strong>B</strong></button>
      <button type="button" (click)="exec('italic')"
        class="toolbar-btn italic" title="Italic">I</button>
      <button type="button" (click)="exec('underline')"
        class="toolbar-btn underline" title="Underline">U</button>

      <span class="w-px h-5 bg-gray-300 mx-1"></span>

      <button type="button" (click)="exec('formatBlock', 'h2')"
        class="toolbar-btn text-xs" title="Heading">H2</button>
      <button type="button" (click)="exec('formatBlock', 'h3')"
        class="toolbar-btn text-xs" title="Subheading">H3</button>
      <button type="button" (click)="exec('formatBlock', 'p')"
        class="toolbar-btn text-xs" title="Paragraph">P</button>

      <span class="w-px h-5 bg-gray-300 mx-1"></span>

      <button type="button" (click)="exec('insertUnorderedList')"
        class="toolbar-btn" title="Bullet list">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
      <button type="button" (click)="exec('insertOrderedList')"
        class="toolbar-btn" title="Numbered list">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01"/>
        </svg>
      </button>

      <span class="w-px h-5 bg-gray-300 mx-1"></span>

      <ng-content select="[slot=toolbar-extra]"></ng-content>
    </div>

    <!-- Editor -->
    <div
      #editor
      contenteditable="true"
      [attr.placeholder]="placeholder"
      (input)="onInput()"
      (blur)="onTouched()"
      class="min-h-[160px] max-h-[400px] overflow-y-auto p-3 border border-gray-300 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm prose prose-sm max-w-none
             [&_.placeholder-tag]:bg-blue-100 [&_.placeholder-tag]:text-blue-800 [&_.placeholder-tag]:rounded [&_.placeholder-tag]:px-1 [&_.placeholder-tag]:font-mono [&_.placeholder-tag]:text-xs"
    ></div>
  `,
  styles: [`
    :host { display: block; }
    .toolbar-btn {
      @apply p-1 min-w-[28px] text-sm rounded hover:bg-gray-200 text-gray-700 transition-colors flex items-center justify-center;
    }
    [contenteditable]:empty:before {
      content: attr(placeholder);
      color: #9ca3af;
      pointer-events: none;
    }
  `]
})
export class RichTextEditorComponent implements AfterViewInit, OnChanges, ControlValueAccessor {
  @Input() value = '';
  @Input() placeholder = 'Write your message here...';
  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('editor') editorRef!: ElementRef<HTMLDivElement>;

  private onChange: (val: string) => void = () => {};
  onTouched: () => void = () => {};

  private savedSelection: Range | null = null;

  ngAfterViewInit() {
    if (this.value) {
      this.editorRef.nativeElement.innerHTML = this.value;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value'] && this.editorRef) {
      const current = this.editorRef.nativeElement.innerHTML;
      if (current !== this.value) {
        this.editorRef.nativeElement.innerHTML = this.value ?? '';
      }
    }
  }

  exec(command: string, value?: string) {
    this.editorRef.nativeElement.focus();
    document.execCommand(command, false, value);
    this.onInput();
  }

  onInput() {
    const html = this.editorRef.nativeElement.innerHTML;
    this.onChange(html);
    this.valueChange.emit(html);
  }

  insertHtml(html: string) {
    this.editorRef.nativeElement.focus();
    if (this.savedSelection) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(this.savedSelection);
      }
    }
    document.execCommand('insertHTML', false, html);
    this.onInput();
  }

  saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      this.savedSelection = sel.getRangeAt(0);
    }
  }

  // ControlValueAccessor
  writeValue(val: string) {
    this.value = val ?? '';
    if (this.editorRef) {
      this.editorRef.nativeElement.innerHTML = this.value;
    }
  }

  registerOnChange(fn: (val: string) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void) { this.onTouched = fn; }
}
