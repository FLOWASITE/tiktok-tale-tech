

## Plan: Implement Expert Review Feedback — 3 Priority Fixes

Based on the expert's detailed review (score 4/5), implementing the top 3 recommended improvements by impact/effort ratio.

---

### Fix 1: Add light context for `brand_only` mode

**Problem**: `brand_only` strips ALL strategic context (persona, journey, role). Two images for same brand but different audiences look identical.

**Change in `image-prompt-builders.ts`** — modify `buildStrategicContext` (line 365-437):

Currently returns `null` for any mode that isn't `full`. Change to inject a **lightweight hint** for `brand_only`:

```typescript
// brand_only: inject lightweight persona + journey hint (not full directives)
if (params.promptMode === 'brand_only') {
  const hints: string[] = [];
  if (params.persona) {
    const p = params.persona;
    let hint = `Hint: This content targets ${p.name}`;
    if (p.ageRange) hint += ` (${p.ageRange})`;
    if (p.occupation) hint += `, ${p.occupation}`;
    hints.push(hint + '.');
  }
  if (params.journeyStage) {
    const stageLabels = { awareness: 'awareness', consideration: 'consideration', decision: 'decision', retention: 'retention' };
    hints.push(`Content stage: ${stageLabels[params.journeyStage] || params.journeyStage}. Consider this for emotional tone.`);
  }
  if (hints.length === 0) return null;
  return {
    id: 'strategic_context', position: 'core', priority: 80,
    content: `## CONTEXT HINTS (Informational — prioritize user description):\n${hints.join('\n')}`,
  };
}
```

This injects just persona name/age + journey stage as "hints" — not full directives. AI model treats these as soft signals.

**PromptPreview update**: For `brand_only`, show persona and journey as "Áp dụng nhẹ" (partial) instead of "Không áp dụng". Use a different visual treatment — half-opacity (opacity-60) with a `~` indicator instead of `EyeOff`.

---

### Fix 2: Collapse inactive rows in PromptPreview

**Problem**: In `raw` mode, 4 inactive rows (persona, role, angle, hook) each say "Không áp dụng" — wastes space, adds noise.

**Change in `PromptPreview.tsx`**: Replace individual inactive rows with a single summary line + mode switch link.

```
Active rows render normally.
Then at the bottom, one italic line:
"ℹ️ Đối tượng, vai trò, góc tiếp cận, hook không áp dụng ở chế độ này."
```

Implementation:
- Separate rows into `activeRows` and `inactiveLabels` arrays
- Render active rows normally
- If `inactiveLabels.length > 0`, render one summary `<p>` with joined labels
- For `brand_only` mode (after Fix 1), persona/journey show as "partial" rows, remaining inactive ones collapse

---

### Fix 3: Generation signal tracking

**Problem**: No feedback loop — system can't learn which mode works for which brand/user.

**Database migration**: Create `generation_signals` table:

```sql
create table public.generation_signals (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brand_templates(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  prompt_mode text not null,
  channel text not null,
  image_style text,
  accepted boolean default false,
  regenerated boolean default false,
  edited_background boolean default false,
  edited_text boolean default false,
  switched_mode boolean default false,
  time_to_accept_ms integer,
  created_at timestamptz default now()
);

alter table public.generation_signals enable row level security;

create policy "Users can insert own signals"
  on public.generation_signals for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read own signals"
  on public.generation_signals for select to authenticated
  using (auth.uid() = user_id);
```

**Frontend tracking**: Create a `useGenerationSignals` hook that:
- Records a signal row when image generation completes
- Updates `accepted: true` when user proceeds without regenerating
- Updates `regenerated: true` on "Tạo lại" click
- Updates `edited_background/edited_text` on respective edit actions
- Tracks `time_to_accept_ms` from generation complete to user action

This runs in background — zero UX impact. Data accumulates for future smart defaults.

---

### Summary

| # | Fix | Files | Effort |
|---|-----|-------|--------|
| 1 | Light context for brand_only | `image-prompt-builders.ts` | ~25 lines |
| 2 | Collapse inactive PromptPreview rows | `PromptPreview.tsx` | ~30 lines |
| 3 | Generation signal tracking | DB migration + new hook | ~80 lines |

Total: ~135 lines changed/added. No breaking changes. Fix 1-2 are UX improvements, Fix 3 is infrastructure for future smart defaults.

