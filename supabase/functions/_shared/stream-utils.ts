// ============================================
// Shared Stream Utilities
// Common SSE/streaming helpers used across agents
// ============================================

/**
 * Parse an SSE ReadableStream into text content
 * Handles OpenAI-compatible streaming format
 */
export async function streamToText(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });

    for (const line of text.split('\n')) {
      if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
      try {
        const parsed = JSON.parse(line.slice(6));
        const content =
          parsed.choices?.[0]?.delta?.content ||
          parsed.choices?.[0]?.message?.content;
        if (content) chunks.push(content);
      } catch {
        // Incomplete JSON chunk, skip
      }
    }
  }

  return chunks.join('');
}
