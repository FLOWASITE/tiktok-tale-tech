

# Fix: Show Topic AI Results on UI

## Root Cause Analysis

After tracing the entire data flow end-to-end, the architecture is correctly wired:
- Backend: `research-node.ts` extracts `suggestedTopics` from `discover_topics` results
- Backend: `graph-engine.ts` (line 728-740) emits `topic_suggestions` SSE event  
- Frontend: `useChatStreaming.ts` (line 288) captures event into `pendingSuggestedTopics`
- Frontend: `ChatMessageBubble.tsx` (line 257) renders `TopicSuggestionsCard`

However, the event emission has **no logging** and the topic data format may not match what the frontend expects. The `TopicSuggestionsCard` requires `{ topic, category, score, reasoning }` but the cached/raw data from Topic AI may use different field names (`title`, `name`, `overallScore`).

## Fix (2 files)

### 1. Backend: Add logging + normalize topic data (`graph-engine.ts`)

In the `onNodeComplete` handler (lines 728-740), add:
- A `console.log` to confirm event emission
- Normalize each topic object to ensure field names match `SuggestedTopic` interface

```typescript
if (nodeName === 'research' && update) {
  const u = update as any;
  if (u.suggestedTopics?.length) {
    const normalizedTopics = u.suggestedTopics.map((t: any) => ({
      topic: t.topic || t.title || t.name || 'Untitled',
      category: t.category || t.pillar || 'general',
      score: t.score ?? t.overallScore ?? null,
      reasoning: t.reasoning || t.explanation || null,
    }));
    console.log(`[GraphEngine] Emitting topic_suggestions: ${normalizedTopics.length} topics, best: ${u.bestTopic}`);
    options.onEvent?.({
      type: 'topic_suggestions',
      data: {
        topics: normalizedTopics,
        best_topic: u.bestTopic || undefined,
      },
    });
  }
}
```

### 2. Frontend: Add debug logging (`useChatStreaming.ts`)

At the `topic_suggestions` handler (line 288), add a `console.log` to confirm receipt:

```typescript
if (parsed.type === 'topic_suggestions' && parsed.data?.topics) {
  console.log('[Chat] Received topic_suggestions:', parsed.data.topics.length, 'topics');
  pendingSuggestedTopics = parsed.data.topics;
  pendingSelectedTopic = parsed.data.best_topic || undefined;
  continue;
}
```

## Why This Should Fix It

1. **Data normalization** ensures field names always match regardless of how Topic AI returns them (cached vs fresh, different response formats)
2. **Logging** lets us confirm in the next test whether the event is actually emitted and received
3. No architectural changes needed -- the pipeline is correctly wired, just needs format consistency

