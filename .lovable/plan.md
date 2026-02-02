
# Tối Ưu Button Row trong MultiChannelViewer

## Phân Tích Hiện Trạng

Button row hiện tại có 6 elements khi ở chế độ view:

| Element | Chức năng | Tần suất sử dụng |
|---------|-----------|------------------|
| Bản nháp (Dropdown) | Chọn trạng thái | Thấp |
| Text/Mockup (Toggle) | Chuyển view | Cao |
| Tạo lại | Regenerate content | Trung bình |
| Sửa | Edit content | Cao |
| Tạo ảnh/Tạo lại ảnh | Generate image | Thấp |
| Copy (icon) | Copy content | Cao |

**Vấn đề:**
- Quá nhiều buttons chiếm không gian ngang
- Các actions có tần suất sử dụng khác nhau nhưng chiếm cùng mức độ hiển thị
- Không có nhóm logic rõ ràng giữa các actions

## Giải Pháp

### Option A: Gộp actions ít dùng vào "More" menu
Giữ các actions chính (Text/Mockup, Sửa, Copy) và gộp các actions phụ (Tạo lại, Tạo ảnh, Bản nháp dropdown) vào một dropdown "Thêm" (MoreHorizontal icon).

**Layout mới:**
```
[Text/Mockup] [Sửa] [Copy] [⋯ More]
                            ├── Tạo lại nội dung
                            ├── Tạo ảnh / Tạo lại ảnh  
                            ├── ─────────────
                            └── Trạng thái: Bản nháp ▸
```

### Option B: Nhóm theo loại với separator
Giữ nguyên các buttons nhưng thêm visual separator giữa các nhóm logic.

**Layout mới:**
```
[Bản nháp ▾] | [Text/Mockup] | [Sửa] [Tạo lại] [Ảnh] [Copy]
              │               │
     Status   │   View Mode   │   Actions
```

### Option C: Compact mode với tooltips (Khuyến nghị)
- Chuyển một số buttons sang icon-only với tooltips
- Giữ labels cho actions chính

**Layout mới:**
```
[Bản nháp ▾] [Text|Mockup] [✏️ Sửa] [🔄] [🖼️] [📋]
                                     │    │    └── Copy (tooltip)
                                     │    └── Tạo ảnh (tooltip)
                                     └── Tạo lại (tooltip)
```

## Đề Xuất Implementation (Option C)

Chuyển các buttons ít dùng (Tạo lại, Tạo ảnh) sang dạng icon-only với tooltip, giữ Sửa có label vì đây là action chính.

### Thay đổi code

**File:** `src/components/MultiChannelViewer.tsx`

1. **Button "Tạo lại"** - Chuyển sang icon-only:
```tsx
// Từ:
<Button variant="outline" size="sm" onClick={() => handleRegenerate(channel)} ...>
  <RefreshCw className="..." />
  Tạo lại
</Button>

// Thành:
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="outline" size="icon" onClick={() => handleRegenerate(channel)} ...>
      <RefreshCw className="w-4 h-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Tạo lại nội dung</TooltipContent>
</Tooltip>
```

2. **Button "Tạo ảnh"** - Chuyển sang icon-only:
```tsx
// Từ:
<Button variant="outline" size="sm" onClick={...}>
  <ImagePlus className="..." />
  {hasImage ? 'Tạo lại ảnh' : 'Tạo ảnh'}
</Button>

// Thành:
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="outline" size="icon" onClick={...}>
      <ImagePlus className="w-4 h-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>{hasImage ? 'Tạo lại ảnh' : 'Tạo ảnh'}</TooltipContent>
</Tooltip>
```

3. **Button "Copy"** - Thêm tooltip (đã là icon-only):
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="outline" size="icon" onClick={() => handleCopy(channel)} ...>
      {copiedChannel === channel ? <Check className="..." /> : <Copy className="..." />}
    </Button>
  </TooltipTrigger>
  <TooltipContent>Sao chép nội dung</TooltipContent>
</Tooltip>
```

4. **Wrap trong TooltipProvider** (nếu chưa có)

### Kết quả

**Trước:**
```
[● Bản nháp ▾] [Text|Mockup] [🔄 Tạo lại] [✏️ Sửa] [🖼️ Tạo lại ảnh] [📋]
```

**Sau:**
```
[● Bản nháp ▾] [Text|Mockup] [🔄] [✏️ Sửa] [🖼️] [📋]
                             ↑            ↑    ↑
                        (tooltip)    (tooltip) (tooltip)
```

## Technical Details

- TooltipProvider đã có trong codebase (`src/components/ui/tooltip.tsx`)
- Sử dụng `size="icon"` thay vì `size="sm"` cho buttons icon-only
- Class `h-8 w-8` để giữ kích thước đồng nhất
- Giữ nguyên logic `hasImage` cho dynamic tooltip content

## Ước tính thời gian
~5 phút
