
## Cải thiện UI cho bước Content trong Pipeline

### ✅ Đã triển khai

#### Backend
- `content-node.ts`: Thêm `onProgress` callback, emit 3 sub-steps (preparing → generating_channels → finalizing)
- `nodes/index.ts`: Thêm `onContentProgress` vào `NodeExecutionContext`, wire vào `createContentNode`
- `chat-topics/index.ts`: Wire `onContentProgress` → SSE `node_progress` event
- `sse-writer.ts`: Thêm `node_progress` vào `AgentSSEEvent` type

#### Frontend
- `ChatThinkingIndicator.tsx`: Mở rộng `ProgressStep` interface (+`subLabel`, `+progress`)
- `useChatStreaming.ts`: Handle `node_progress` SSE event + fallback timer (2s interval, animate 0→92%)
- `AgentPipelineBar.tsx`: Hiển thị sub-label + mini progress bar cho active pill (desktop)
