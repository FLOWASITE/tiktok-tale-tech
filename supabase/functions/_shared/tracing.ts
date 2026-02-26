// ============================================
// Distributed Tracing Module
// W3C Trace Context compatible
// Propagates traceId/spanId across all layers
// ============================================

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  attributes: Record<string, string | number | boolean>;
  status: 'ok' | 'error' | 'running';
}

export interface Trace {
  traceId: string;
  rootSpanId: string;
  spans: Map<string, Span>;
}

// ---- Trace Factory ----

/**
 * Create a new trace with a root span.
 * If requestId provided, uses it as traceId for correlation with frontend.
 */
export function createTrace(requestId?: string): Trace {
  const traceId = requestId || crypto.randomUUID();
  const rootSpanId = generateSpanId();

  const rootSpan: Span = {
    traceId,
    spanId: rootSpanId,
    name: 'root',
    startTime: Date.now(),
    attributes: {},
    status: 'running',
  };

  const spans = new Map<string, Span>();
  spans.set(rootSpanId, rootSpan);

  return { traceId, rootSpanId, spans };
}

/**
 * Create a child span under a parent.
 */
export function createSpan(
  trace: Trace,
  parentSpanId: string,
  name: string,
  attributes: Record<string, string | number | boolean> = {}
): Span {
  const spanId = generateSpanId();
  const span: Span = {
    traceId: trace.traceId,
    spanId,
    parentSpanId,
    name,
    startTime: Date.now(),
    attributes,
    status: 'running',
  };

  trace.spans.set(spanId, span);
  return span;
}

/**
 * End a span, recording duration.
 */
export function endSpan(span: Span, status: 'ok' | 'error' = 'ok'): void {
  span.endTime = Date.now();
  span.durationMs = span.endTime - span.startTime;
  span.status = status;
}

/**
 * Get W3C Trace Context headers for external API calls.
 */
export function getTraceHeaders(traceId: string, spanId: string): Record<string, string> {
  return {
    'x-trace-id': traceId,
    'x-span-id': spanId,
    // W3C traceparent: version-traceId-spanId-flags
    'traceparent': `00-${traceId.replace(/-/g, '').slice(0, 32).padEnd(32, '0')}-${spanId.replace(/-/g, '').slice(0, 16).padEnd(16, '0')}-01`,
  };
}

/**
 * Export trace summary for logging/metrics.
 */
export function getTraceSummary(trace: Trace): {
  traceId: string;
  totalSpans: number;
  totalDurationMs: number;
  spanSummaries: Array<{ name: string; durationMs?: number; status: string }>;
} {
  const root = trace.spans.get(trace.rootSpanId);
  const totalDurationMs = root?.durationMs || (Date.now() - (root?.startTime || Date.now()));

  const spanSummaries = [...trace.spans.values()].map(s => ({
    name: s.name,
    durationMs: s.durationMs,
    status: s.status,
  }));

  return {
    traceId: trace.traceId,
    totalSpans: trace.spans.size,
    totalDurationMs,
    spanSummaries,
  };
}

// ---- Helpers ----

function generateSpanId(): string {
  return crypto.randomUUID().split('-')[0] + crypto.randomUUID().split('-')[0];
}
