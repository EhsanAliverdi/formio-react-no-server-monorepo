import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntegrationsService } from '../../../core/services/integrations.service';
import { environment } from '../../../../environments/environment';

type Tab = 'email' | 'mex';
type TestState = { status: 'idle' } | { status: 'testing' } | { status: 'ok'; message: string } | { status: 'fail'; message: string };

@Component({
  selector: 'app-admin-integrations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold text-gray-800 dark:text-white">Integrations</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Connect external services to SurveyFlow.</p>
        </div>
        <button
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          (click)="save()"
          [disabled]="saving() || loading()"
        >{{ saving() ? 'Saving…' : 'Save' }}</button>
      </div>

      @if (error()) {
        <div class="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:border-red-700 dark:text-red-300">{{ error() }}</div>
      }
      @if (saveSuccess()) {
        <div class="rounded border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:border-green-700 dark:text-green-300">Integration settings saved.</div>
      }

      <!-- Tab bar -->
      <div class="border-b border-gray-200 dark:border-gray-700">
        <nav class="flex gap-6" aria-label="Integration tabs">
          @for (tab of tabs; track tab.id) {
            <button
              class="pb-3 text-sm font-medium border-b-2 transition-colors"
              [class.border-blue-600]="activeTab() === tab.id"
              [class.text-blue-600]="activeTab() === tab.id"
              [class.border-transparent]="activeTab() !== tab.id"
              [class.text-gray-500]="activeTab() !== tab.id"
              [class.dark:text-gray-400]="activeTab() !== tab.id"
              (click)="activeTab.set(tab.id)"
            >
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="tab.icon" />
                </svg>
                {{ tab.label }}
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  [class.bg-green-100]="isTabEnabled(tab.id)"
                  [class.text-green-700]="isTabEnabled(tab.id)"
                  [class.bg-gray-100]="!isTabEnabled(tab.id)"
                  [class.text-gray-500]="!isTabEnabled(tab.id)"
                  [class.dark:bg-green-900]="isTabEnabled(tab.id)"
                  [class.dark:text-green-300]="isTabEnabled(tab.id)"
                  [class.dark:bg-gray-700]="!isTabEnabled(tab.id)"
                  [class.dark:text-gray-400]="!isTabEnabled(tab.id)"
                >{{ isTabEnabled(tab.id) ? 'Enabled' : 'Disabled' }}</span>
              </span>
            </button>
          }
        </nav>
      </div>

      @if (loading()) {
        <div class="text-sm text-gray-500">Loading…</div>
      } @else {

        <!-- EMAIL TAB -->
        @if (activeTab() === 'email') {
          <div class="space-y-4">
            <div class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-base font-semibold dark:text-white">Email service</h2>
                <label class="flex items-center gap-2 cursor-pointer">
                  <div class="relative">
                    <input type="checkbox" class="sr-only peer" [(ngModel)]="emailEnabled" />
                    <div class="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors dark:bg-gray-600"></div>
                    <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow"></div>
                  </div>
                  <span class="text-sm text-gray-600 dark:text-gray-300">{{ emailEnabled ? 'Enabled' : 'Disabled' }}</span>
                </label>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Send emails for password resets and form submissions.
              </p>

              <!-- Provider selector -->
              <div class="mb-5">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Provider</label>
                <div class="flex gap-3">
                  @for (p of emailProviders; track p.id) {
                    <button
                      type="button"
                      class="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
                      [class.border-blue-500]="emailProvider === p.id"
                      [class.bg-blue-50]="emailProvider === p.id"
                      [class.text-blue-700]="emailProvider === p.id"
                      [class.dark:bg-blue-950]="emailProvider === p.id"
                      [class.dark:text-blue-300]="emailProvider === p.id"
                      [class.border-gray-200]="emailProvider !== p.id"
                      [class.text-gray-600]="emailProvider !== p.id"
                      [class.dark:border-gray-600]="emailProvider !== p.id"
                      [class.dark:text-gray-300]="emailProvider !== p.id"
                      (click)="emailProvider = p.id"
                    >{{ p.label }}</button>
                  }
                </div>
              </div>

              <!-- SMTP fields -->
              @if (emailProvider === 'smtp') {
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <label class="field-label">SMTP Host</label>
                    <input class="field" [(ngModel)]="smtpHost" placeholder="smtp.example.com" />
                  </div>
                  <div>
                    <label class="field-label">Port</label>
                    <input class="field" [(ngModel)]="smtpPort" placeholder="587" />
                  </div>
                  <div>
                    <label class="field-label">Username</label>
                    <input class="field" [(ngModel)]="smtpUsername" placeholder="user@example.com" autocomplete="off" />
                  </div>
                  <div>
                    <label class="field-label">
                      Password
                      @if (smtpPasswordSet()) {
                        <span class="ml-1 text-xs text-green-600 font-normal">(set — enter new to change)</span>
                      }
                    </label>
                    <input class="field" type="password" [(ngModel)]="smtpPassword" placeholder="••••••••" autocomplete="new-password" />
                  </div>
                  <div class="flex items-center gap-2 lg:col-span-2">
                    <input type="checkbox" id="smtpTls" [(ngModel)]="smtpTls" class="rounded border-gray-300" />
                    <label for="smtpTls" class="text-sm text-gray-700 dark:text-gray-300">Use TLS / STARTTLS</label>
                  </div>
                </div>
              }

              <!-- SendGrid fields -->
              @if (emailProvider === 'sendgrid') {
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div class="lg:col-span-2">
                    <label class="field-label">
                      SendGrid API Key
                      @if (sendgridApiKeySet()) {
                        <span class="ml-1 text-xs text-green-600 font-normal">(set — enter new to change)</span>
                      }
                    </label>
                    <input class="field" type="password" [(ngModel)]="sendgridApiKey" placeholder="SG.••••••••" autocomplete="new-password" />
                  </div>
                </div>
              }

              <!-- Sender identity -->
              <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <label class="field-label">From email</label>
                  <input class="field" [(ngModel)]="emailFrom" type="email" placeholder="noreply@example.com" />
                </div>
                <div>
                  <label class="field-label">From name</label>
                  <input class="field" [(ngModel)]="emailFromName" placeholder="SurveyFlow" />
                </div>
              </div>
            </div>

            <!-- Email test panel -->
            <div class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
              <h3 class="text-sm font-semibold text-gray-800 dark:text-white mb-1">Test connection</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Send a test email using the current settings (saved or unsaved). Unsaved credentials typed above will be used if provided.
              </p>
              <div class="flex items-end gap-3 flex-wrap">
                <div class="flex-1 min-w-[220px]">
                  <label class="field-label">Send test email to</label>
                  <input class="field" type="email" [(ngModel)]="emailTestAddress" placeholder="you@example.com" />
                </div>
                <button
                  class="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                  (click)="testEmail()"
                  [disabled]="emailTestState().status === 'testing' || !emailTestAddress"
                >
                  @if (emailTestState().status === 'testing') {
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Testing…
                  } @else {
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    Send test
                  }
                </button>
              </div>
              <ng-container *ngTemplateOutlet="testResult; context: { $implicit: emailTestState() }"></ng-container>
            </div>
          </div>
        }

        <!-- MEX TAB -->
        @if (activeTab() === 'mex') {
          <div class="space-y-4">
            <div class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-base font-semibold dark:text-white">MEX Maintenance</h2>
                <label class="flex items-center gap-2 cursor-pointer">
                  <div class="relative">
                    <input type="checkbox" class="sr-only peer" [(ngModel)]="mexEnabled" />
                    <div class="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors dark:bg-gray-600"></div>
                    <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow"></div>
                  </div>
                  <span class="text-sm text-gray-600 dark:text-gray-300">{{ mexEnabled ? 'Enabled' : 'Disabled' }}</span>
                </label>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Connect to MEX Maintenance to push work orders, assets, and form submissions directly into your MEX system.
              </p>

              <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div class="lg:col-span-2">
                  <label class="field-label">MEX API Base URL</label>
                  <input class="field" [(ngModel)]="mexBaseUrl" placeholder="https://mex.yourorg.com/api" />
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">The root URL of your MEX Web API instance.</p>
                </div>
                <div class="lg:col-span-2">
                  <label class="field-label">
                    API Key (XApiKey header)
                    @if (mexApiKeySet()) {
                      <span class="ml-1 text-xs text-green-600 font-normal">(set — enter new to change)</span>
                    }
                  </label>
                  <input class="field" type="password" [(ngModel)]="mexApiKey" placeholder="••••••••" autocomplete="new-password" />
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Sent as the <code class="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">XApiKey</code> header on every MEX API request.</p>
                </div>
              </div>
            </div>

            <!-- MEX test panel -->
            <div class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
              <h3 class="text-sm font-semibold text-gray-800 dark:text-white mb-1">Test connection</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Verify the MEX API is reachable using the current credentials. Unsaved values typed above will be used if provided.
              </p>
              <div class="flex flex-wrap gap-3">
                <button
                  class="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                  (click)="testMex()"
                  [disabled]="mexTestState().status === 'testing'"
                >
                  @if (mexTestState().status === 'testing') {
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Testing…
                  } @else {
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                    Test connection
                  }
                </button>

                <button
                  class="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                  (click)="initiateMexRequestTest()"
                  [disabled]="mexRequestTestState().status === 'testing'"
                >
                  @if (mexRequestTestState().status === 'testing') {
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Creating…
                  } @else {
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Create test request
                  }
                </button>
              </div>
              <ng-container *ngTemplateOutlet="testResult; context: { $implicit: mexTestState() }"></ng-container>
              <ng-container *ngTemplateOutlet="testResult; context: { $implicit: mexRequestTestState() }"></ng-container>
            </div>

            <!-- MEX capabilities reference -->
            <div class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
              <h3 class="text-sm font-semibold text-gray-800 dark:text-white mb-3">Available MEX capabilities</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                @for (cap of mexCapabilities; track cap.name) {
                  <div class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <svg class="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {{ cap.name }}
                  </div>
                }
              </div>
            </div>
          </div>
        }

      }
    </div>

    <!-- Production confirmation modal -->
    @if (showProdConfirm()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" (click)="showProdConfirm.set(false)"></div>
        <div class="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
              <svg class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">You are about to create a test request in Production</h3>
            </div>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            This will create a real <strong>Request</strong> record in your live MEX Maintenance environment.
            The request will be marked as a test and can be deleted manually afterwards.
          </p>
          <p class="text-sm font-medium text-amber-700 dark:text-amber-400">
            Are you sure you want to proceed?
          </p>
          <div class="flex justify-end gap-3 pt-2">
            <button
              class="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              (click)="showProdConfirm.set(false)"
            >Cancel</button>
            <button
              class="rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-sm font-medium text-white"
              (click)="confirmMexRequestTest()"
            >Yes, create test request</button>
          </div>
        </div>
      </div>
    }

    <!-- Shared test result banner -->
    <ng-template #testResult let-state>
      @if (state.status === 'ok') {
        <div class="mt-3 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-700 px-4 py-2.5 text-sm text-green-700 dark:text-green-300">
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {{ state.message }}
        </div>
      }
      @if (state.status === 'fail') {
        <div class="mt-3 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-700 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          {{ state.message }}
        </div>
      }
    </ng-template>
  `,
  styles: [`
    .field {
      @apply w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500;
    }
    .field-label {
      @apply block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1;
    }
  `],
})
export class IntegrationsComponent implements OnInit {
  private svc = inject(IntegrationsService);

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  saveSuccess = signal(false);
  activeTab = signal<Tab>('email');

  // Email fields
  emailEnabled = false;
  emailProvider: 'smtp' | 'sendgrid' = 'smtp';
  smtpHost = '';
  smtpPort = '';
  smtpUsername = '';
  smtpPassword = '';
  smtpTls = true;
  sendgridApiKey = '';
  emailFrom = '';
  emailFromName = '';
  smtpPasswordSet = signal(false);
  sendgridApiKeySet = signal(false);
  emailTestAddress = '';
  emailTestState = signal<TestState>({ status: 'idle' });

  // MEX fields
  mexEnabled = false;
  mexBaseUrl = '';
  mexApiKey = '';
  mexApiKeySet = signal(false);
  mexTestState = signal<TestState>({ status: 'idle' });
  mexRequestTestState = signal<TestState>({ status: 'idle' });
  showProdConfirm = signal(false);

  readonly isProduction = environment.production;

  readonly tabs = [
    {
      id: 'email' as Tab,
      label: 'Email',
      icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
    },
    {
      id: 'mex' as Tab,
      label: 'MEX Maintenance',
      icon: 'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z',
    },
  ];

  readonly emailProviders = [
    { id: 'smtp' as const, label: 'SMTP' },
    { id: 'sendgrid' as const, label: 'SendGrid' },
  ];

  readonly mexCapabilities = [
    { name: 'Assets' }, { name: 'Work Orders' }, { name: 'Requests' },
    { name: 'Employees' }, { name: 'Suppliers' }, { name: 'Purchase Orders' },
    { name: 'Goods Receipts' }, { name: 'Catalogue Items' }, { name: 'Departments' },
    { name: 'Job Types' }, { name: 'Trade Codes' }, { name: 'Documents' },
  ];

  isTabEnabled(tab: Tab): boolean {
    return tab === 'email' ? this.emailEnabled : this.mexEnabled;
  }

  ngOnInit(): void {
    this.svc.getIntegrations().subscribe({
      next: data => {
        this.emailEnabled = data.email.enabled;
        this.emailProvider = data.email.provider ?? 'smtp';
        this.smtpHost = data.email.smtpHost ?? '';
        this.smtpPort = data.email.smtpPort ?? '';
        this.smtpUsername = data.email.smtpUsername ?? '';
        this.smtpTls = data.email.smtpTls ?? true;
        this.smtpPasswordSet.set(data.email.smtpPasswordSet);
        this.sendgridApiKeySet.set(data.email.sendgridApiKeySet);
        this.emailFrom = data.email.fromEmail ?? '';
        this.emailFromName = data.email.fromName ?? '';
        this.mexEnabled = data.mex.enabled;
        this.mexBaseUrl = data.mex.baseUrl ?? '';
        this.mexApiKeySet.set(data.mex.apiKeySet);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load integration settings.');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    this.saving.set(true);
    this.error.set(null);
    this.saveSuccess.set(false);

    const payload: any = {
      email: {
        enabled: this.emailEnabled ? 'true' : 'false',
        provider: this.emailProvider,
        smtpHost: this.smtpHost,
        smtpPort: this.smtpPort,
        smtpUsername: this.smtpUsername,
        smtpTls: this.smtpTls ? 'true' : 'false',
        fromEmail: this.emailFrom,
        fromName: this.emailFromName,
      },
      mex: {
        enabled: this.mexEnabled ? 'true' : 'false',
        baseUrl: this.mexBaseUrl,
      },
    };

    if (this.smtpPassword) payload.email.smtpPassword = this.smtpPassword;
    if (this.sendgridApiKey) payload.email.sendgridApiKey = this.sendgridApiKey;
    if (this.mexApiKey) payload.mex.apiKey = this.mexApiKey;

    this.svc.updateIntegrations(payload).subscribe({
      next: data => {
        this.smtpPasswordSet.set(data.email.smtpPasswordSet);
        this.sendgridApiKeySet.set(data.email.sendgridApiKeySet);
        this.mexApiKeySet.set(data.mex.apiKeySet);
        this.smtpPassword = '';
        this.sendgridApiKey = '';
        this.mexApiKey = '';
        this.saving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 4000);
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Failed to save integration settings.');
      },
    });
  }

  testEmail(): void {
    this.emailTestState.set({ status: 'testing' });
    const payload: any = { toEmail: this.emailTestAddress, provider: this.emailProvider };
    if (this.smtpHost) payload.smtpHost = this.smtpHost;
    if (this.smtpPort) payload.smtpPort = this.smtpPort;
    if (this.smtpUsername) payload.smtpUsername = this.smtpUsername;
    if (this.smtpPassword) payload.smtpPassword = this.smtpPassword;
    payload.smtpTls = this.smtpTls ? 'true' : 'false';
    if (this.sendgridApiKey) payload.sendgridApiKey = this.sendgridApiKey;
    if (this.emailFrom) payload.fromEmail = this.emailFrom;
    if (this.emailFromName) payload.fromName = this.emailFromName;

    this.svc.testEmail(payload).subscribe({
      next: res => this.emailTestState.set({ status: 'ok', message: res.message }),
      error: err => this.emailTestState.set({ status: 'fail', message: err?.error?.error || 'Test failed.' }),
    });
  }

  testMex(): void {
    this.mexTestState.set({ status: 'testing' });
    const payload: any = {};
    if (this.mexBaseUrl) payload.baseUrl = this.mexBaseUrl;
    if (this.mexApiKey) payload.apiKey = this.mexApiKey;

    this.svc.testMex(payload).subscribe({
      next: res => this.mexTestState.set({ status: 'ok', message: res.message }),
      error: err => this.mexTestState.set({ status: 'fail', message: err?.error?.error || 'Test failed.' }),
    });
  }

  initiateMexRequestTest(): void {
    this.mexRequestTestState.set({ status: 'idle' });
    if (this.isProduction) {
      this.showProdConfirm.set(true);
    } else {
      this.executeMexRequestTest(false);
    }
  }

  confirmMexRequestTest(): void {
    this.showProdConfirm.set(false);
    this.executeMexRequestTest(true);
  }

  private executeMexRequestTest(confirmedProduction: boolean): void {
    this.mexRequestTestState.set({ status: 'testing' });
    const payload: any = { confirmedProduction };
    if (this.mexBaseUrl) payload.baseUrl = this.mexBaseUrl;
    if (this.mexApiKey) payload.apiKey = this.mexApiKey;

    this.svc.testMexRequest(payload).subscribe({
      next: res => {
        if (res.requiresConfirmation) {
          // Server says production but client didn't confirm — show modal
          this.mexRequestTestState.set({ status: 'idle' });
          this.showProdConfirm.set(true);
        } else {
          this.mexRequestTestState.set({ status: 'ok', message: res.message || 'Test request created successfully.' });
        }
      },
      error: err => this.mexRequestTestState.set({ status: 'fail', message: err?.error?.error || 'Failed to create test request.' }),
    });
  }
}
