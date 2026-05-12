import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 class="text-2xl font-bold text-gray-900">My Profile</h1>
    </div>
  `,
})
export class MyProfileComponent {}
