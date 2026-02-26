

# Sprint 11 - UI/UX Polish & Bug Fixes

## Findings from Review

After thorough inspection of all Sprint 11 components, I found **4 issues** that need fixing:

---

### Issue 1: ContentFeedback forwardRef Warning (Console ERROR)

**Problem:** The browser console shows: `"Function components cannot be given refs. Did you mean to use React.forwardRef()?"` from `ChatMessageBubble.tsx` referencing `ContentFeedback`.

**Root Cause:** `ContentFeedback` is a plain function component but something in the render tree is passing a ref to it (likely from AnimatePresence/motion or Tooltip wrapping).

**Fix:** Wrap `ContentFeedback` export with `React.forwardRef()` in `src/components/chat/ContentFeedback.tsx`.

---

### Issue 2: WorkflowPreviewTooltip Nesting Conflict

**Problem:** In `ChatInputArea.tsx` (lines 272-303), the `WorkflowPreviewTooltip` wraps another `Tooltip` component. This creates **nested Tooltip providers** -- both are using Radix `TooltipTrigger asChild` targeting the same Button element. This can cause:
- Tooltip flickering or not showing
- Only one tooltip visible at a time

**Fix:** Merge the two tooltips into one. When `supervisorEnabled` is true, show the workflow preview content in the tooltip; otherwise show the simple "Gửi" hint. Remove the inner `Tooltip` wrapper when `WorkflowPreviewTooltip` is active.

---

### Issue 3: AgentSessionSummary Always Visible After First Use

**Problem:** In `TopicAIChatbot.tsx` (lines 313-318), the summary shows when `!isLoading && displayPipelineSteps.length > 0`. But `displayPipelineSteps` persists via `lastPipelineSteps` state (set at line ~175). This means the summary card stays permanently visible even when the user sends new messages, cluttering the chat area.

**Fix:** Add condition to only show summary when all steps are complete AND no new loading is happening. Also hide when a new user message is sent after the summary appeared. Track this via a `showSessionSummary` state that resets on new message send.

---

### Issue 4: AgentTimeline Sequential-Only Estimation

**Problem:** `AgentTimeline.tsx` assumes all agents run sequentially (cumulative start times). In reality, some agents (Research, Brand Memory, Compliance) can run in parallel. This makes the timeline visually misleading -- showing 12s total when actual wall-clock time might be 6s.

**Fix:** Group the first 3 agents (research, brand_memory, compliance) as parallel (same startMs = 0), then subsequent agents start after the max duration of the parallel group. This better reflects the actual Multi-Agent orchestration pattern.

---

## Implementation Plan

| Step | File | Change |
|------|------|--------|
| 1 | `src/components/chat/ContentFeedback.tsx` | Wrap with `forwardRef` to fix console warning |
| 2 | `src/components/topic/chatbot/ChatInputArea.tsx` | Merge nested tooltips to avoid conflict |
| 3 | `src/components/topic/TopicAIChatbot.tsx` | Add `showSessionSummary` state, reset on new send |
| 4 | `src/components/topic/chatbot/AgentTimeline.tsx` | Support parallel agent groups in timeline estimation |

### Technical Details

**Step 1 - forwardRef fix:**
```tsx
export const ContentFeedback = forwardRef<HTMLDivElement, ContentFeedbackProps>(
  function ContentFeedback(props, ref) {
    // wrap outer div with ref
    return <div ref={ref} ...>...</div>;
  }
);
```

**Step 2 - Tooltip merge:**
Remove the inner `<Tooltip>` when `WorkflowPreviewTooltip` is enabled. The `WorkflowPreviewTooltip` already provides tooltip content showing the agent workflow.

**Step 3 - Session summary auto-hide:**
Add state `showSessionSummary` that becomes true when pipeline completes, and resets to false when user sends a new message via `handleSend`.

**Step 4 - Parallel timeline:**
```tsx
const PARALLEL_GROUP = ['research', 'brand_memory', 'compliance'];
// Group parallel agents at startMs=0, sequential agents after
```

