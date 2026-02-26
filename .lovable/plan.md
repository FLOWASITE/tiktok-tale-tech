

# Add Orchestrator Agent to UI + Upgrade Model

## Overview
Make the Orchestrator visible as the first agent in the pipeline UI, and upgrade its LLM model from `gemini-2.5-flash` to `gemini-2.5-pro` for better planning quality.

## Changes

### 1. Backend: Emit Orchestrator Events (graph-engine.ts)

In `runOrchestrator()` (lines 607-615), wrap the orchestrator call with `node_start` and `node_complete` events so the frontend can track it:

```
onEvent({ type: 'node_start', data: { node: 'orchestrator' } })
// ... orchestrateWorkflow() ...
onEvent({ type: 'node_complete', data: { node: 'orchestrator', durationMs, reasoning } })
```

Also include the orchestrator in the `graph_plan` event so it appears first in the progress steps.

### 2. Backend: Upgrade Orchestrator Model (orchestrator.ts)

Change `model: "google/gemini-2.5-flash"` to `model: "google/gemini-2.5-pro"` at line 297 for more accurate intent classification and plan generation.

### 3. Frontend: Add Orchestrator to Progress Steps (useChatStreaming.ts)

Add `'orchestrator': '🎯 Orchestrator'` to the `nodeLabels` map (line 296). The existing `node_start`/`node_complete` handlers will automatically handle status updates.

### 4. Frontend: Add Orchestrator to All Agent UI Components

Update 4 component files to include the Orchestrator agent:

| File | Change |
|------|--------|
| `AgentPipelineBar.tsx` | Add orchestrator as first entry in `AGENT_CONFIG` with `Crosshair` icon |
| `AgentInsightsTab.tsx` | Add orchestrator as first entry in `AGENTS` list |
| `AgentTimeline.tsx` | Add 'orchestrator' to `PARALLEL_AGENTS` exclusion (it runs before everything) |
| `ChatThinkingIndicator.tsx` | Add `'orchestrator'` to the agent icon map |

### 5. Frontend: Handle Orchestrator in Timeline

The orchestrator runs before all other agents (it's not parallel, not sequential with others -- it's Phase 0). In `AgentTimeline.tsx`, treat it as starting at `0ms` with others starting after it completes.

## Execution Flow After Change

```text
[Orchestrator] --> [Research, Brand Memory, Compliance] (parallel) --> Strategy --> Content --> Image --> Reviewer --> Governor
```

## Technical Details

- Icon: `Crosshair` from lucide-react (represents targeting/planning)
- Vietnamese label: `Điều phối` 
- The orchestrator step will show planning duration (typically 0.5-2s for fast-path, 2-4s for LLM planning)
- Model upgrade: `gemini-2.5-pro` provides better reasoning for complex intent classification and graph planning
