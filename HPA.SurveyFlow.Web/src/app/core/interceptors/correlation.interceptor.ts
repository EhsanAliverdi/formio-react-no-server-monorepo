import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { TelemetryService } from '../services/telemetry.service';

const CORRELATION_HEADER = 'X-Correlation-ID';
const TRACEPARENT_HEADER = 'traceparent';

function shortId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

/**
 * Attaches a W3C traceparent and a short X-Correlation-ID to every outgoing request.
 *
 * When telemetry is enabled the OTEL SDK's FetchInstrumentation already injects
 * traceparent automatically for fetch() calls — this interceptor covers HttpClient
 * (which uses XHR under the hood) and always ensures X-Correlation-ID is present
 * so the API can stamp its logs regardless of telemetry state.
 *
 * The correlation ID is derived from the trace ID so both headers point at the same
 * logical operation when OTEL is active.
 */
export const correlationInterceptor: HttpInterceptorFn = (req, next) => {
  const telemetry = inject(TelemetryService);

  const traceparent = telemetry.generateTraceparent();
  // Use the trace ID embedded in the traceparent as the correlation ID so both headers
  // refer to the same logical operation.
  const correlationId = telemetry.traceIdFrom(traceparent).slice(0, 16);

  const outgoing = req.clone({
    setHeaders: {
      [TRACEPARENT_HEADER]: traceparent,
      [CORRELATION_HEADER]: correlationId || shortId(),
    },
  });

  return next(outgoing);
};
