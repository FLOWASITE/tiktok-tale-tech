## Mục tiêu
Refactor block đầu của `MultiChannelFormWizard` thành **Hybrid 2 Mode** để user chọn entry point đúng best practice SEO, đồng thời giữ flow nhanh cho social content.

## 2 Mode

### Mode A — "Theo SEO" (Pillar/Keyword first)
Flow: **Pillar → Keyword target → AI suggest Topics → Chọn 1 → Generate**
- Mặc định khi user chọn ≥1 long-form channel (`website`, `blogger`, `wordpress`).
- Tận dụng edge function `suggest-cluster-topics` (đã có) để AI gợi ý 5 topic title bám sát keyword.

### Mode B — "Theo ý tưởng" (Topic first — flow hiện tại)
Flow: **Topic → AI gợi ý Pillar phù hợp (heuristic) → Generate**
- Mặc định khi chỉ có social channel (FB/IG/TikTok/...).
- Giữ nguyên TopicIdeaHub + Brainstorm AI hiện tại.

## UI

### Mode switcher (đặt ngay đầu Step 1, trên Topic)
Tabs / segmented control 2 nút:
```
[ ⚡ Theo ý tưởng ]   [ 🎯 Theo SEO Pillar ]
```
- Smart default theo channel mix (chuyển mode khi user thêm/bỏ long-form channel, có toast nhẹ "Đã chuyển sang chế độ SEO vì bạn chọn Website").
- User vẫn có thể đổi tay; lựa chọn được persist trong localStorage `mc:entry_mode`.

### Mode A layout (SEO-first)
```
┌─ Định hướng SEO ─────────────────────┐
│ 1. Pillar:    [ClusterPicker]        │
│    ↳ context mini: vol/keywords/used │
│ 2. Keyword:   [KeywordTargetPicker]  │
│    ↳ pre-fill top-5, user tinh chỉnh │
│ 3. Topic:     [3-5 AI title chips]   │
│    ↳ "Tạo gợi ý" button              │
│       hoặc gõ tay vào ô Topic        │
└──────────────────────────────────────┘
```
Khi user click 1 chip topic → fill vào Textarea topic hiện tại. Vẫn cho phép edit tay.

### Mode B layout (giữ nguyên hiện tại)
- Topic Textarea + TopicIdeaHub + Brainstorm AI ở trên.
- Pillar/Keyword block move xuống dưới như hiện tại nhưng đổi label "AI gợi ý gắn pillar phù hợp" với match heuristic + 1-click apply.

## File thay đổi

### Tạo mới
- `src/components/multichannel/EntryModeSwitcher.tsx` — segmented tabs + smart default logic.
- `src/components/multichannel/SeoFirstEntry.tsx` — orchestrator Mode A (Pillar → Keyword → Topic suggest).
- `src/components/multichannel/PillarKeywordSection.tsx` — block Pillar + KeywordTargetPicker dùng chung cho cả 2 mode.
- `src/components/seo/SuggestedTopicsFromKeyword.tsx` — gọi `suggest-cluster-topics` edge function, render 3-5 chip title + "Tạo lại".
- `src/hooks/useEntryMode.ts` — state machine: `'idea' | 'seo'` + auto-switch theo channels + localStorage persist.
- `src/hooks/useSuggestedPillar.ts` — heuristic match topic ↔ cluster (Mode B).

### Sửa
- `src/components/multichannel/MultiChannelFormWizard.tsx`:
  - Thêm `<EntryModeSwitcher />` đầu Step 1.
  - Conditional render: `mode === 'seo' ? <SeoFirstEntry/> : <currentTopicBlock + suggestedPillarBanner/>`.
  - Pillar block hiện tại (lines 1291–1317) move vào `PillarKeywordSection` shared component.
- `src/components/seo/ClusterPicker.tsx`: top-5 keyword default thay vì all keyword (bỏ overload).
- Tận dụng `KeywordTargetPicker.tsx` (đã có) — không sửa.

### Edge function (đã có sẵn, chỉ cần wire UI)
- `supabase/functions/suggest-cluster-topics`: nhận `cluster_id` + `keyword_ids` + `brand_template_id` → trả 3-5 topic title.
- Đã đăng ký category `seo` trong Admin AI Config (theo mem `seo/admin-ai-config-vn`).

## Chi tiết kỹ thuật

- **Smart default rule**: khi `formData.channels` thay đổi
  - Có long-form channel + chưa có override tay → set mode = `'seo'`, toast.
  - Bỏ hết long-form + chưa override → set mode = `'idea'`, toast.
  - User click switcher = set `mode_override = true`, không auto đổi nữa cho đến khi reset form.
- **Topic suggest call**: trigger khi user click "Tạo gợi ý topic" ở Mode A; cache theo `[clusterId, sortedKeywordIds]` 10 phút.
- **Mode A mà chưa chọn pillar**: disable button "Tạo gợi ý topic", show hint "Chọn pillar trước".
- **Empty pillars**: Mode A hiện CTA "Tạo Pillar đầu tiên ở /seo Plan tab", vẫn cho user gõ topic tay (graceful fallback).
- **State shape không đổi**: `formData.{topic, clusterId, targetKeywordIds}` giữ nguyên — backend pipeline không phải đổi.
- **Memory note**: Lưu `mem://features/multichannel/hybrid-entry-mode-vn` ghi rule smart-default + persistence.

## Out of scope
- Không tạo pillar/keyword mới từ form (vẫn redirect `/seo`).
- Không đổi prompt `generate-multichannel`.
- Không AI re-rank keyword trong form.
