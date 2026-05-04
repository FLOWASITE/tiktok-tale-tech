## Mục tiêu
Cho phép user **đặt mặc định "Chế độ SEO"** (ON/OFF) cho form Tạo nội dung đa kênh, để mỗi lần mở form mới không phải bật/tắt lại.

## Vấn đề hiện tại
`useEntryMode` đang persist mỗi lần toggle vào `localStorage['mc:entry_mode']` → mode ổn định nhưng không có khái niệm "mặc định" rõ ràng, và user không có nút chủ động set/reset default.

## Thiết kế

### 1. Tách "current mode" và "default mode" trong `src/hooks/useEntryMode.ts`
- Thêm key `mc:entry_mode_default` (lưu preference mặc định).
- Khởi tạo `mode` theo thứ tự: session state → `default` key → `'idea'`.
- API mới:
  ```ts
  { mode, setMode, defaultMode, setAsDefault, resetDefault, isCurrentDefault }
  ```
  - `setMode(next)`: chỉ đổi session (vẫn lưu lightweight để giữ qua reload trong cùng phiên).
  - `setAsDefault()`: ghi `mode` hiện tại vào `mc:entry_mode_default`.
  - `resetDefault()`: xoá key default → quay về `'idea'`.

### 2. UI: bổ sung nút "Đặt làm mặc định" trong `SeoModeToggle.tsx`
- Thêm props: `isDefault?: boolean`, `onSetAsDefault?: () => void`.
- Layout (giữ Soft Luxury, không emoji):
  ```text
  [🎯] Chế độ SEO  ⓘ            [Switch]
       Cần chọn Pillar → Keyword
       ── Mặc định: BẬT  •  [Đặt làm mặc định]   (link-style button)
  ```
- Nếu `isCurrentDefault` → hiển thị badge nhỏ "Mặc định" (neutral gray), ẩn nút.
- Nếu khác default → hiện link "Đặt làm mặc định" (text-xs, text-primary, hover underline).
- Tooltip Info bổ sung dòng: *"Bấm 'Đặt làm mặc định' để mọi form mới tự bật/tắt theo lựa chọn này."*

### 3. Wire-up trong `MultiChannelFormWizard.tsx` (~line 1188)
```tsx
const { mode: entryMode, setMode: setEntryMode, isCurrentDefault, setAsDefault } = useEntryMode();
...
<SeoModeToggle
  enabled={entryMode === 'seo'}
  onChange={(v) => setEntryMode(v ? 'seo' : 'idea')}
  disabled={isGenerating}
  isDefault={isCurrentDefault}
  onSetAsDefault={() => {
    setAsDefault();
    toast({ title: 'Đã lưu mặc định', description: `Chế độ SEO ${entryMode === 'seo' ? 'BẬT' : 'TẮT'} sẽ áp dụng cho lần tạo sau.` });
  }}
/>
```

## Files thay đổi
- `src/hooks/useEntryMode.ts` — thêm default key + helper API.
- `src/components/multichannel/SeoModeToggle.tsx` — thêm nút/badge "Mặc định".
- `src/components/multichannel/MultiChannelFormWizard.tsx` — wire 2 prop mới + toast.

## Acceptance
- Bật/tắt switch → đổi ngay session hiện tại.
- Bấm "Đặt làm mặc định" → toast confirm, badge "Mặc định" thay nút.
- Reload trang / mở form mới → khởi tạo theo default đã lưu.
- Không có default → fallback `'idea'` (giữ behavior cũ cho user mới).
