import { Component, input } from '@angular/core';
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
        </section>
      }
    </div>
  `,
})
export class HelpContentComponent {
  topic = input.required<HelpTopic>();
}
