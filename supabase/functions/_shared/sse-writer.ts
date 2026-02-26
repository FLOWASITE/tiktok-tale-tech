// SSE Writer utility — extracted from agentic-loop.ts

export interface AgentSSEEvent {
  type: 'turn_start' | 'tool_executing' | 'tool_result' | 'turn_complete' | 'content_chunk' | 'final_response' | 'error' | 'agent_step_result';
  data: any;
}

export interface SSEWriter {
  write: (event: AgentSSEEvent) => Promise<void>;
}

export function createSSEWriter(writer: WritableStreamDefaultWriter<Uint8Array>): SSEWriter {
  const encoder = new TextEncoder();
  
  return {
    write: async (event: AgentSSEEvent) => {
      const sseEvent = `data: ${JSON.stringify(event)}\n\n`;
      await writer.write(encoder.encode(sseEvent));
    },
  };
}
