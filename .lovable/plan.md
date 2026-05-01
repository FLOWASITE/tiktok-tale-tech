
## Problem

All seasonal/festival events are dated in 2025 (both in the `curated_events` database table and the hardcoded `SEASONAL_EVENTS` constant). Since it's now May 2026, the "upcoming events" filter removes everything, so no seasonal suggestions appear.

## Plan

### 1. Update `curated_events` table with 2026 events (migration)

Insert new rows for 2026 Vietnamese seasonal events (May 2026 onwards):
- Ngày của Mẹ (11/05/2026), Ngày của Cha (21/06/2026), Quốc khánh 2/9, Trung Thu, Halloween, 20/10, 11/11, Black Friday, Giáng Sinh, Tất Niên 2026, Tết 2027

Each with appropriate `suggested_topics`, `suggested_angles`, `event_type`, and `priority`.

### 2. Update `SEASONAL_EVENTS` in `src/types/topicDiscovery.ts`

Replace hardcoded 2025 dates with a dynamic year calculation so the static calendar auto-recurs annually. Events that have already passed this year will show next year's date.

### 3. Update `UpcomingEventsCard` date logic

Add a fallback: if an event's date is past, bump it to the next occurrence (same month/day, next year). This prevents the card from going blank between calendar refreshes.

## Technical Details

- Migration: `INSERT INTO curated_events` with 10-12 rows for H2 2026 + Q1 2027
- `topicDiscovery.ts`: Replace `new Date(2025, ...)` with a helper `nextOccurrence(month, day)` that returns the nearest future date
- `UpcomingEventsCard.tsx`: No structural changes needed once dates are dynamic
- `DiscoveryFeedPanel.tsx`: Already handles rendering correctly; the only issue is empty data
