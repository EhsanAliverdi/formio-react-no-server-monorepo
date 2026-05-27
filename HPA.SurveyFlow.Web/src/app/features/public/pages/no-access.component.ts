import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-no-access',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="w-full">
      <div class="rounded-2xl border border-gray-200 bg-white p-6">
        <h1 class="text-xl font-semibold text-gray-800">No access</h1>
        <p class="mt-2 text-sm text-gray-600">You don't have permission to view this page.</p>
        <div class="mt-5 flex items-center gap-2">
          <a routerLink="/" class="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Back to home</a>
        </div>
      </div>
    </div>
  `,
})
export class NoAccessComponent {}
