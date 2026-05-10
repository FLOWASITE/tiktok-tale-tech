// Shared SSE helper for import-brand-from-website / import-brand-from-fanpage.
// Returns a streaming Response and a writer object the caller uses to emit events.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface BrandImportSSE {
  response: Response;
  emit: (event: string, data: Record<string, unknown>) => Promise<void>;
  close: () => Promise<void>;
}

export function createBrandImportSSE(): BrandImportSSE {
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  let closed = false;

  const emit = async (event: string, data: Record<string, unknown>) => {
    if (closed) return;
    const payload = `data: ${JSON.stringify({ type: event, ...data })}\n\n`;
    try {
      await writer.write(encoder.encode(payload));
    } catch {
      closed = true;
    }
  };

  const close = async () => {
    if (closed) return;
    closed = true;
    try { await writer.close(); } catch { /* ignore */ }
  };

  const response = new Response(stream.readable, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });

  return { response, emit, close };
}
