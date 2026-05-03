---
name: Hybrid Entry Mode (Multichannel)
description: MultiChannelFormWizard 2-mode entry — idea-first là mặc định hệ thống, SEO opt-in qua switcher, persist localStorage
type: feature
---

# Hybrid Entry Mode — MultiChannelFormWizard

Step 1 của form tạo nội dung đa kênh có **2 chế độ**:

## Mode B — `idea` (Topic-first) — **MẶC ĐỊNH HỆ THỐNG**
Flow: **Topic → AI gợi ý Pillar phù hợp (heuristic) → Generate**
- Component: TopicIdeaHub + `PillarKeywordSection (variant=inline)` (banner suggest)
- Heuristic match: `useSuggestedPillar` tokenize topic ↔ cluster.name + keyword names, score≥1
- **Áp dụng cho mọi tổ hợp kênh**, kể cả khi chọn long-form (Website/Blog/WordPress)

## Mode A — `seo` (Pillar-first) — **OPT-IN**
Flow: **Pillar → Keyword target (top-5) → AI gợi ý Topics → Chọn 1 → Generate**
- Component: `SeoFirstEntry` → `PillarKeywordSection (variant=card)` + `SuggestedTopicsFromKeyword`
- Edge function: `suggest-cluster-topics` (đã có, category=`seo`)
- **Chỉ kích hoạt khi user tự click vào EntryModeSwitcher** — không bao giờ auto

## Persist (`useEntryMode`)
- Lưu mode trong localStorage `mc:entry_mode` để nhớ lựa chọn user qua các session.
- KHÔNG có auto-switch theo channels, KHÔNG có override flag, KHÔNG có toast.
- Mặc định khi chưa có gì trong localStorage = `'idea'`.

## State shape (KHÔNG đổi)
`formData.{topic, clusterId, targetKeywordIds}` giữ nguyên. Backend pipeline `generate-multichannel` không phải sửa.

## Files
- `src/hooks/useEntryMode.ts` (signature: `useEntryMode()` — không tham số)
- `src/hooks/useSuggestedPillar.ts`
- `src/components/multichannel/EntryModeSwitcher.tsx`
- `src/components/multichannel/SeoFirstEntry.tsx`
- `src/components/multichannel/PillarKeywordSection.tsx` (shared)
- `src/components/seo/SuggestedTopicsFromKeyword.tsx`
- Wired vào `src/components/multichannel/MultiChannelFormWizard.tsx` Step 1

## Best practice rationale
SEO chuẩn (Keyword → Topic) là nâng cao — không phải user nào cũng có pillar/keyword sẵn. Idea-first giảm rào cản cho user mới. Power user muốn SEO discipline thì tự bật.
