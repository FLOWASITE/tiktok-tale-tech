

# Đơn giản hóa luồng tạo kịch bản — Từ 3 bước xuống 2 bước

## Phân tích vấn đề

Hiện tại user phải đi qua **3 bước với 7 section** và chọn từ **42+ options**:
- Step 1: Mục đích (5) + Chủ đề + Góc tiếp cận (5) + Hook
- Step 2: Thời lượng (4) + Thể loại (15 trong accordion) + Nhân vật (11 trong accordion) + Giọng (3) + Hội thoại (4)  
- Step 3: Review + Campaign + Generate

Điểm mấu chốt: **Hệ thống đã có `VideoTypeRecommendations` và `CharacterTypeRecommendations` tự gợi ý dựa trên topic**. Vậy tại sao bắt user phải chọn thủ công?

## Giải pháp: Smart Defaults + 2-Step Flow

```text
TRƯỚC (3 steps, 7 sections):
Step 1: Purpose → Topic → Hook
Step 2: Duration → VideoType → Character → Voice → Dialogue
Step 3: Review → Generate

SAU (2 steps, gọn hơn 60%):
Step 1: Purpose → Topic → Hook (giữ nguyên)
Step 2: Smart Summary (auto-filled) + [Tùy chỉnh ▾] → Generate
```

### Thay đổi chi tiết

#### 1. `ScriptFormStepper.tsx` — Gộp Step 2 + Step 3, dùng Smart Defaults

- **Xóa Step 2 cũ** (toàn bộ 4 sections Duration/VideoType/Character/Voice)
- **Step 2 mới = Review + Generate** với smart defaults tự điền:
  - Duration: mặc định 60s
  - VideoType: lấy từ `topRecommendation` nếu có, fallback `expert_share`  
  - Character: lấy từ `topRecommendation` nếu có, fallback `the_virtuoso`
  - Voice/Dialogue: giữ mặc định `northern` / `monologue`
- Hiển thị summary dạng **compact chips có thể click để thay đổi**
- Thêm 1 nút **"Tùy chỉnh nâng cao"** collapsible chứa toàn bộ selectors cũ cho power users
- STEPS array giảm từ 3 xuống 2: `[Nội dung, Tạo kịch bản]`

#### 2. Smart Summary — Inline Editable Chips

Thay vì review card tĩnh, dùng **clickable chips** cho mỗi config:

```text
┌─────────────────────────────────────────────┐
│  ✓ Sẵn sàng tạo kịch bản                   │
│                                             │
│  [60s ▾] [Chuyên gia chia sẻ ▾] [VEO 3]   │
│  [Chuyên gia kỹ thuật ▾] [Bắc • Độc thoại] │
│                                             │
│  ⚙ Tùy chỉnh nâng cao                      │
│                                             │
│  [━━━━ ✨ Tạo kịch bản ━━━━]               │
└─────────────────────────────────────────────┘
```

Mỗi chip khi click sẽ mở **Popover** nhỏ chứa selector tương ứng (Duration, VideoType, Character...) thay vì hiển thị cả trang accordion.

#### 3. Auto-apply Recommendations

- Khi user nhập topic đủ dài (≥10 chars), tự động gọi `useVideoTypeRecommendations` và `useCharacterTypeRecommendations`
- Nếu có `topRecommendation`, tự cập nhật `formData` (chỉ khi user chưa tự chọn)
- Hiển thị badge "AI gợi ý" trên chip đã được auto-fill

#### 4. `StepIndicator` — Cập nhật 2 steps

```typescript
const STEPS: Step[] = [
  { id: 1, title: 'Nội dung', icon: <FileText /> },
  { id: 2, title: 'Tạo kịch bản', icon: <Sparkles /> },
];
```

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `ScriptFormStepper.tsx` | Gộp Step 2+3 thành Step 2 mới với Smart Summary chips + Collapsible advanced |
| `ConfigChipSelector.tsx` | **MỚI** — Component chip có Popover cho mỗi config option |

**Không thay đổi:** DurationSelector, VideoTypeSelector, CharacterTypeSelector, VoiceRegionSelector, DialogueStyleSelector — vẫn giữ nguyên, chỉ được đặt bên trong Popover thay vì hiển thị trực tiếp.

## Kết quả

- User flow: Nhập topic → Bấm "Tiếp" → Review + Generate. **Chỉ 2 click**.
- Power users: Vẫn truy cập đầy đủ 42 options qua Popover chips hoặc "Tùy chỉnh nâng cao"
- AI tự chọn cấu hình tối ưu dựa trên topic — user chỉ cần xác nhận

