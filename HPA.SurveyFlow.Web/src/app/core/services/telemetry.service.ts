import { Injectable } from '@angular/core';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TelemetryService {
  private readonly enabled = environment.telemetry.enabled;

  init(): void {
    if (!this.enabled) return;

    const exporter = new OTLPTraceExporter({
      url: `${environment.telemetry.otlpEndpoint}/v1/traces`,
    });

    const provider = new WebTracerProvider({
      resource: resourceFromAttributes({
        [SEMRESATTRS_SERVICE_NAME]: 'hpa-surveyflow-web',
        [SEMRESATTRS_SERVICE_VERSION]: environment.appVersion,
        'deployment.environment': environment.appEnvironment,
      }),
      spanProcessors: [new BatchSpanProcessor(exporter)],
    });

    provider.register({
      contextManager: new ZoneContextManager(),
      propagator: new W3CTraceContextPropagator(),
    });

    registerInstrumentations({
      instrumentations: [
        // Propagates traceparent to all fetch() calls (e.g. formio SDK, direct fetch usage)
        new FetchInstrumentation({ propagateTraceHeaderCorsUrls: [/.*/] }),
        // Propagates traceparent to all XHR calls (Angular HttpClient uses XHR)
        new XMLHttpRequestInstrumentation({ propagateTraceHeaderCorsUrls: [/.*/] }),
      ],
    });
  }

  /**
   * Generates a W3C traceparent header value.
   * When telemetry is disabled the flags byte is 00 (not sampled) — the header is still
   * sent so the API has a trace ID to correlate its own logs against, but no spans are
   * exported from the browser.
   */
  generateTraceparent(): string {
    const traceId = this.randomHex(32);
    const spanId  = this.randomHex(16);
    const flags   = this.enabled ? '01' : '00';
    return `00-${traceId}-${spanId}-${flags}`;
  }

  /** Extracts the 32-char trace ID from a traceparent string. */
  traceIdFrom(traceparent: string): string {
    return traceparent.split('-')[1] ?? '';
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private randomHex(length: number): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length / 2));
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
}
