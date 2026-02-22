# Visual Engine V3 - Vertical Slice (Education + Instagram Feed)

## Overview

Build a complete end-to-end vertical slice for the image suggestion and scoring pipeline, targeting one specific case: **education goal, educational angle, sprout role, instagram_feed channel, service industry**. This validates the full logic before scaling to all 30 combinations.

## Pipeline Flow

```text
Input Context (goal, angle, role, channel, industry)
    |
    v
suggestImageStylesV3() --> Top 5 Suggestion[] with scored reasons
    |
    v
generateImagePrompt(suggestion, context) --> prompt string
    |
    v
(Image generation - simulated or real API call)
    |
    v
recordFeedback(suggestionId, rating 1-5, reason?)
    |
    v
adjustWeights(feedbackList) --> update SCORING_CONFIG in-memory
```

## Files to Create/Edit

### 1. NEW: `src/config/visualScoringConfig.ts`

Scoring configuration with documented rationale and source citations for every value.

**Contents:**

- `BASE_SCORES`: Per-style base score (0-100) with inline comments citing sources (Sprout Social 2026, ScienceDirect 2025, Hootsuite 2026)
- `INDUSTRY_BOOST`: Per-industry score adjustments (starting with `service`)
- `CHANNEL_BOOST`: Per-channel score adjustments (starting with `instagram_feed`)
- `ROLE_BOOST`: Function-based per-style multiplier (not uniform), e.g. `sprout: (style) => style === 'photorealistic' ? 1.20 : 1.0`
- `GOAL_BOOST`: Per-goal adjustments (starting with `education`)
- `ANGLE_BOOST`: Per-angle adjustments (starting with `educational`)
- All values typed, no magic numbers, every boost commented with rationale

### 2. EDIT: `src/lib/imageSuggestionEngine.ts` (new file, replaces logic from `src/utils/imageStyleSuggestion.ts`)

The V3 suggestion engine.

**Key changes from V2 (`imageStyleSuggestion.ts`):**

- New interface `SuggestionInputV3` adds: `contentGoal`, `contentAngle`, `contentRole`, `channel`, `hookMessage`
- New interface `SuggestionV3`: `{ id, style, score, reason, suggestedType, typography, matchPercentage }`
- Function `suggestImageStylesV3(input: SuggestionInputV3): SuggestionV3[]`:
  - Score = BASE_SCORES[style] + INDUSTRY_BOOST + CHANNEL_BOOST + (base * ROLE_BOOST multiplier) + GOAL_BOOST + ANGLE_BOOST
  - Deduplicate with `Set`
  - Reason string includes source citation (e.g. "Photorealistic - recommended per Sprout Social 2026 for service industry trust")
  - Returns top 5 sorted by score
  - `suggestedType` maps to `background_only` or `with_text` based on role/channel
  - `typography` suggests style based on channel + role
- V2 function `suggestImageStyles()` remains unchanged for backward compatibility

### 3. NEW: `src/lib/imagePromptGenerator.ts`

Generates optimized image generation prompts.

**Contents:**

- Function `generateImagePrompt(suggestion: SuggestionV3, context: PromptContext): string`
- `PromptContext`: `{ topic, brandTone, channel, contentRole, hookMessage?, industry? }`
- Prompt optimized for Instagram feed (4:5 or 1:1 aspect, text overlay considerations, human-centric for service)
- Uses channel config from `channelImageConfig.ts` for platform-specific directions
- Role-aware prompt adjustments:
  - `seed`: emotional, curiosity-driven visuals
  - `sprout`: informative, trust-building, educational visuals
  - `harvest`: product-focused, CTA-friendly visuals

### 4. NEW: `src/lib/feedbackEngine.ts`

In-memory feedback collection and weight adjustment.

**Contents:**

- Interface `ImageFeedback`: `{ suggestionId, style, rating (1-5), reason?, timestamp }`
- `feedbackStore`: In-memory array (later can hook to DB)
- `recordFeedback(suggestionId, rating, reason?)`: Adds to store, returns updated stats
- `adjustWeights(feedbackHistory): AdjustedConfig`: After 10+ feedback items, calculates average rating per style and adjusts BASE_SCORES proportionally
- `getFeedbackStats()`: Returns summary of all feedback collected
- `resetFeedback()`: Clears in-memory store

### 5. NEW: `src/demo/educationInstagramDemo.ts`

Demo function for end-to-end testing.

**Contents:**

- `runEducationInstagramDemo()`: Runs full pipeline with example topic "5 cach giam stress cho dan van phong"
- Console output for each step:
  1. Input context display
  2. Top 5 suggestions with scores and reasons
  3. Generated prompt for top suggestion
  4. Simulated 10 feedback entries (mix of ratings)
  5. Adjusted weights after feedback
  6. Re-run suggestions showing changed rankings
- Can be called from browser console for quick demo

### 6. NEW: Unit Tests

- `src/lib/__tests__/imageSuggestionEngine.test.ts`
- `src/lib/__tests__/imagePromptGenerator.test.ts`
- `src/lib/__tests__/feedbackEngine.test.ts`

**Test coverage targets (>= 80%):**

- Suggestion engine: correct scoring, deduplication, top-5 ordering, reason formatting, edge cases (missing inputs)
- Prompt generator: correct format, channel-specific adjustments, role-aware content
- Feedback engine: recording, weight adjustment after 10 items, stats calculation, reset

## What Stays Unchanged

- `src/utils/imageStyleSuggestion.ts` (V2) - remains for backward compatibility, existing components keep using it
- `src/config/channelImageConfig.ts` - consumed by the new prompt generator but not modified
- All existing image generation components (`SimpleImageGenerator`, `UnifiedImageGenerator`) - no changes in this slice

## Out of Scope (confirmed)

- No dashboard UI
- No React components
- No production image generator integration (prompt string only)
- No multi-channel beyond instagram_feed
- No DB persistence for feedback (in-memory only in this slice)
- No changes to existing V2 suggestion flow

## Technical Notes

- All code typed with TypeScript, comments in English
- No magic numbers - every score/boost has inline rationale comment
- V3 engine is additive, not replacing V2 - both can coexist
- Demo function exportable for console testing
- Feedback engine designed with DB hook interface for future persistence

&nbsp;