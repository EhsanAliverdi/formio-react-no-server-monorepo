import { Component, input, signal } from '@angular/core';
import { HelpTopic } from './help.models';

@Component({
  selector: 'app-help-content',
  standalone: true,
  template: `
    <div class="space-y-5 text-sm text-gray-600">
      @if (topic().summary) {
        <p class="leading-6 text-gray-700">{{ topic().summary }}</p>
      }

      @for (section of topic().sections; track $index) {
        <section class="space-y-2">
          @if (section.heading) {
            <h3 class="font-semibold text-gray-900">{{ section.heading }}</h3>
          }
          @for (paragraph of section.paragraphs ?? []; track $index) {
            <p class="leading-6">{{ paragraph }}</p>
          }
          @if (section.bullets?.length) {
            <ul class="list-disc space-y-1.5 pl-5">
              @for (bullet of section.bullets; track $index) {
                <li class="leading-6">{{ bullet }}</li>
              }
            </ul>
          }
          @if (section.note) {
            <p class="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2.5 leading-5 text-indigo-800">
              {{ section.note }}
            </p>
          }
          @if (section.copyBlock; as copyBlock) {
            <div class="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <div class="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 py-2">
                <span class="text-xs font-semibold text-gray-700">{{ copyBlock.label }}</span>
                <button type="button" class="ta-btn ta-btn-secondary h-8 px-3 text-xs"
                  (click)="copy(copyBlock.text)">
                  {{ copiedText() === copyBlock.text ? 'Copied' : (copyBlock.buttonLabel ?? 'Copy') }}
                </button>
              </div>
              <pre class="max-h-80 overflow-auto whitespace-pre-wrap p-3 text-xs leading-5 text-gray-700">{{ copyBlock.text }}</pre>
            </div>
          }
        </section>
      }
    </div>
  `,
})
export class HelpContentComponent {
  topic = input.required<HelpTopic>();
  copiedText = signal<string | null>(null);

  async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }

    this.copiedText.set(text);
    setTimeout(() => {
      if (this.copiedText() === text) this.copiedText.set(null);
    }, 2000);
  }
}
