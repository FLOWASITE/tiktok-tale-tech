

# Mở rộng badge gợi ý chủ đề để hiển thị đầy đủ tiêu đề

## Vấn đề hiện tại

Mỗi gợi ý chủ đề render dạng pill chip ngang (`flex-wrap gap-1.5`) với `max-w-[560px]` + `truncate`. Tiêu đề tiếng Việt dài 80–150 ký tự bị cắt thành "Những thay đổi trong quy định về bảo hiểm xã hội và thuế TNCN năm 2026: Doanh n…" — user phải hover tooltip mới đọc được.

## Thay đổi đề xuất

### 1. Đổi layout chip → row card full-width

File: `src/components/TopicSuggestionPanel.tsx` (~line 984–1024)

- **Container**: `flex flex-wrap gap-1.5` → `flex flex-col gap-1.5` (1 chủ đề / 1 hàng, full width của parent).
- **Chip**: `inline-flex … rounded-full` → `flex w-full items-start … rounded-xl` để chip giãn theo chiều ngang container và **wrap text 2 dòng** thay vì truncate.
- **Tiêu đề**: bỏ `truncate max-w-[560px]`, thay bằng:
  ```
  className="flex-1 text-xs xs:text-sm leading-snug line-clamp-2"
  ```
  (vẫn giới hạn 2 dòng để tránh chip cao bất thường nếu có outlier 300 ký tự, nhưng đủ để hiện ~140–180 ký tự thay vì ~70).
- **Font size**: `text-[10px] xs:text-xs` → `text-xs xs:text-sm` (rõ ràng hơn, dễ đọc).
- **Padding**: `px-2 xs:px-2.5 py-1 xs:py-1.5` → `px-3 py-2` (badge "to" hơn theo yêu cầu).
- **Icon category**: giữ `w-4 h-4` nhưng align `mt-0.5 shrink-0` để align top khi text 2 dòng.
- **Action buttons hover** (Bookmark/ThumbsUp/Down): chuyển từ `hidden group-hover:flex` inline sau text → `absolute top-1.5 right-1.5` để không chiếm chỗ của tiêu đề khi hover.
- **Score / Engagement / Seasonal badges**: gom thành 1 row nhỏ bên dưới tiêu đề (`flex items-center gap-1 mt-1`) thay vì inline cuối — tránh đẩy tiêu đề.

### 2. Giữ tương thích

- Click handler, `ensureSelectedTopic`, `disabled state`, tooltip, savedTopics, feedback — không đổi.
- Vẫn show `title={suggestion.topic}` để tooltip native HTML có full text khi text quá 2 dòng vẫn bị clamp.
- `showEnhancedInfo` flag giữ nguyên, chỉ thay đổi vị trí render meta badges.

### 3. Responsive

- Mobile (`<640px`): row height tự động wrap 2 dòng, font `text-xs`.
- Desktop: `text-sm` 2 dòng, comfortable reading width 100% container (~700–900px tuỳ form layout).

## File sửa

| File | Thay đổi |
|---|---|
| `src/components/TopicSuggestionPanel.tsx` | Refactor block chip render (line ~984–1095): đổi container thành column, chip thành row card full-width, tiêu đề `line-clamp-2 text-sm`, action buttons absolute, meta badges xuống dòng. |

## Ngoài phạm vi

- Không đổi data flow, AI suggestion engine, scoring, history popover (Kho chủ đề).
- Không thay đổi styling của Kho chủ đề popover (đã có view list/grid riêng).
- Không đổi mobile breakpoints khác.

## Rủi ro

Thấp. Chỉ thay class Tailwind + cấu trúc div trong cùng 1 component. Không ảnh hưởng logic.

