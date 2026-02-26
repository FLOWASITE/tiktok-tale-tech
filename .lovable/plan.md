

# Show Topic AI Results on UI

## Problem
The Research Agent discovers topics via `discover_topics` tool and stores them in GraphState (`suggestedTopics`, `bestTopic`), but the graph engine never emits a `topic_suggestions` SSE event. The frontend already has:
- `useChatStreaming.ts` (line 288): Handles `topic_suggestions` event type
- `ChatMessageBubble.tsx` (line 257): Renders `TopicSuggestionsCard` when `suggestedTopics` exists
- `TopicSuggestionsCard.tsx`: Full UI component ready to display topics

The only missing piece is the backend emitting the event.

## Fix (1 file)

### `supabase/functions/_shared/graph/graph-engine.ts`

In the `onNodeComplete` callback (line 706), after the existing governor-specific logic, add a check: when the completed node is `research` and the state update contains `suggestedTopics`, emit a `topic_suggestions` SSE event with the topics and `bestTopic`.

```typescript
// After line 726 (existing onEvent for node_complete)
if (nodeName === 'research' && update) {
  const u = update as any;
  if (u.suggestedTopics?.length) {
    options.onEvent?.({
      type: 'topic_suggestions',
      data: {
        topics: u.suggestedTopics,
        best_topic: u.bestTopic || undefined,
      },
    });
  }
}
```

This connects the existing backend data to the existing frontend UI -- no new components needed.

## Technical Notes

- The `TopicSuggestionsCard` expects `SuggestedTopic[]` with fields: `topic`, `reasoning`, `category`, `score`
- The `discover_topics` tool returns topics in a compatible format
- The event will be emitted immediately after the research node completes, so users see topic suggestions while content is still being generated

