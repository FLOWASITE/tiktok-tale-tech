---
name: Hybrid Entry Mode (Multichannel)
description: MultiChannelFormWizard 2-mode entry (idea-first vs SEO-first), smart-default theo long-form channel, persisted localStorage
type: feature
---

# Hybrid Entry Mode — MultiChannelFormWizard

Step 1 của form tạo nội dung đa kênh có **2 chế độ**:

## Mode A — `seo` (Pillar-first)
Flow: **Pillar → Keyword target (top-5) → AI gợi ý Topics → Chọn 1 → Generate**
- Component: `SeoFirstEntry` → `PillarKeywordSection (variant=card)` + `SuggestedTopicsFromKeyword`
- Edge function: `suggest-cluster-topics` (đã có, category=`seo`)
- Mặc định khi user chọn ≥1 long-form channel: `website` | `blogger` | `wordpress`

## Mode B — `idea` (Topic-first, flow cũ)
Flow: **Topic → AI gợi ý Pillar phù hợp (heuristic) → Generate**
- Component: TopicIdeaHub + `PillarKeywordSection (variant=inline)` (banner suggest)
- Heuristic match: `useSuggestedPillar` tokenize topic ↔ cluster.name + keyword names, score≥1
- Mặc định khi không có long-form channel

## Smart default & override (`useEntryMode`)
- Auto-switch khi `formData.channels` thay đổi (chưa override).
- User click switcher = set override flag `mc:entry_mode_override=1` → ngừng auto.
- Persist mode trong localStorage `mc:entry_mode`.
- Toast info khi auto chuyển sang `seo`.

## State shape (KHÔNG đổi)
`formData.{topic, clusterId, targetKeywordIds}` giữ nguyên. Backend pipeline `generate-multichannel` không phải sửa.

## Files
- `src/hooks/useEntryMode.ts`
- `src/hooks/useSuggestedPillar.ts`
- `src/components/multichannel/EntryModeSwitcher.tsx`
- `src/components/multichannel/SeoFirstEntry.tsx`
- `src/components/multichannel/PillarKeywordSection.tsx` (shared)
- `src/components/seo/SuggestedTopicsFromKeyword.tsx`
- Wired vào `src/components/multichannel/MultiChannelFormWizard.tsx` Step 1

## Best practice rationale
SEO chuẩn: **Keyword → Topic** (volume/intent có thật). Long-form (Website/Blog) bắt buộc theo hướng này. Social-first (FB/IG/TikTok) cho phép ngược (Topic-first vì ý tưởng quan trọng hơn search volume).
