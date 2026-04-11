

# Fast-Path Decision Analytics Dashboard

## Overview
Add a new "Intent" tab to the AI Management page that visualizes fast-path decision logs from `agent_pipeline_logs` where `agent_name = 'orchestrator_fastpath'`.

## Components

### 1) Hook: `src/hooks/useIntentAnalytics.ts`
Query `agent_pipeline_logs` filtered by `agent_name = 'orchestrator_fastpath'`, ordered by `created_at desc`, limit 500. Parse `output_summary` JSON from each row to extract `intent`, `confidence`, `ambiguityFlag`, `allScores`, `matchedPatterns`, `templateChosen`.

Compute derived metrics:
- **Hit/Miss rate**: count of `action = 'fast_path_hit'` vs `'fast_path_miss'`
- **Ambiguity rate**: % of rows where `ambiguityFlag = true`
- **Intent distribution**: group by `intent`, count each
- **False positive candidates**: rows where `ambiguityFlag = true` AND `confidence < 0.85`, sorted by recency
- **Confidence histogram**: bucket confidence into 0.7-0.8, 0.8-0.9, 0.9-1.0

### 2) Component: `src/components/admin/ai/IntentAnalyticsDashboard.tsx`

Layout (follows existing `AIDashboard.tsx` patterns with Recharts):

**Row 1 — 4 stat cards:**
- Total Decisions (hit + miss count)
- Hit Rate (%)
- Ambiguity Rate (%)
- Avg Confidence

**Row 2 — 2 charts:**
- **Intent Distribution** (PieChart) — top intents by count
- **Confidence Distribution** (BarChart) — histogram of confidence buckets

**Row 3 — Table: False Positive Candidates**
Table showing rows where `ambiguityFlag = true` AND `confidence < 0.85`:
- Columns: Time, Message (truncated), Detected Intent, Confidence, All Scores (top 2), Template
- Sorted by most recent first, max 20 rows
- Highlighted with amber badge for easy identification

### 3) Wire into `AdminAIManagement.tsx`
Add 10th tab "Intent" with `Crosshair` icon, rendering `IntentAnalyticsDashboard`. Update grid from `grid-cols-9` to accommodate (or use scrollable tabs).

## Files to create/edit
- **Create** `src/hooks/useIntentAnalytics.ts`
- **Create** `src/components/admin/ai/IntentAnalyticsDashboard.tsx`
- **Edit** `src/pages/AdminAIManagement.tsx` — add tab

## Technical notes
- Uses existing Recharts (already in AIDashboard)
- Queries only `agent_pipeline_logs` table — no new tables needed
- `output_summary` is stored as text (JSON string), parsed client-side
- Skeleton loading state follows AIDashboard pattern

