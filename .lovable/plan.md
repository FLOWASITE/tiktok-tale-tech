

# Cải thiện ScriptPurposeSelector UI — Soft Luxury

## Vấn đề hiện tại

Selector hiện tại chỉ là 3 pills nhỏ giống nhau, khó phân biệt. Description chỉ hiện khi chọn — user không thấy được sự khác biệt trước khi chọn. Icon quá nhỏ (3.5x3.5) và generic.

## Giải pháp: Card-based selector

Chuyển từ pills sang **3 mini-cards** ngang, mỗi card có icon lớn + tên + mô tả 1 dòng. Khi compact mode (trong form stepper), giữ pills nhưng cải thiện icon.

```text
NON-COMPACT (standalone):
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  🎬           │ │  🎤           │ │  🎥           │
│  Video AI    │ │  Người thật  │ │  Production  │
│  VEO 3,      │ │  Quay/thu âm │ │  Team chuyên │
│  Minimax...  │ │  trực tiếp   │ │  nghiệp      │
└──────────────┘ └──────────────┘ └──────────────┘

COMPACT (trong form stepper - giữ pills nhưng icon rõ hơn):
[🎬 Video AI] [🎤 Người thật] [🎥 Production]
```

### Thay đổi chi tiết

#### `ScriptPurposeSelector.tsx`
1. **Icon cải thiện**: `ai_video` → `Wand2` (AI magic), `teleprompter` → `Mic` (microphone/voice), `production` → `Clapperboard` (giữ nguyên)
2. **Non-compact mode**: Chuyển sang grid 3 cols, mỗi item là card nhỏ với:
   - Icon container `w-10 h-10 rounded-xl` với gradient background riêng mỗi loại
   - Label bold + 1 dòng subtitle mô tả ngắn
   - Selected state: border-primary + subtle glow
   - Style: `rounded-2xl border-border/30 backdrop-blur-sm` (Soft Luxury)
3. **Compact mode**: Giữ pills nhưng dùng icon mới, thêm subtle color tint cho selected
4. **Bỏ phần description panel AnimatePresence** ở dưới — thông tin đã nằm trong card
5. **Thêm subtitle ngắn** vào `SCRIPT_PURPOSE_CONFIG` hoặc inline: `ai_video: "VEO 3, Minimax..."`, `teleprompter: "Quay & thu âm"`, `production: "Team sản xuất"`

#### `src/types/script.ts`
- Thêm field `subtitle` vào `SCRIPT_PURPOSE_CONFIG` cho mô tả ngắn 1 dòng hiển thị trên card

## File thay đổi

| File | Thay đổi |
|------|----------|
| `src/types/script.ts` | Thêm `subtitle` field vào config |
| `src/components/script/ScriptPurposeSelector.tsx` | Redesign card-based layout, icon mới, Soft Luxury style |

