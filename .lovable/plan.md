

# Fix: Nút Lưu bị ẩn trên điện thoại - Agent Model Config Dialog

## Nguyên nhân

Dialog chỉnh sửa Agent Model (`AIAgentModelConfig.tsx` line 175-340) chứa nhiều form fields (Model, Temperature, Max Tokens, Quality Mode, Fallback, Notes). Trên màn hình nhỏ, nội dung tràn ra ngoài viewport nhưng không có scroll riêng cho phần body → `DialogFooter` (chứa nút Lưu/Hủy) bị đẩy xuống dưới, không nhìn thấy được.

## Giải pháp

Thêm wrapper `ScrollArea` cho phần form content bên trong dialog, giới hạn chiều cao tối đa để footer luôn hiển thị:

### Sửa `src/components/admin/ai/AIAgentModelConfig.tsx`

- Wrap phần form (line 188-316) trong `<div className="max-h-[60vh] overflow-y-auto ...">` hoặc dùng `ScrollArea`
- Đảm bảo `DialogFooter` luôn nằm ngoài vùng scroll → luôn visible

```text
DialogContent
├── DialogHeader (fixed)
├── ScrollArea max-h-[60vh]  ← NEW
│   └── Form fields (model, temp, tokens, quality, fallback, notes)
└── DialogFooter (fixed)     ← Always visible
    ├── Reset
    ├── Hủy
    └── Lưu
```

### File thay đổi
- **Sửa**: `src/components/admin/ai/AIAgentModelConfig.tsx` — thêm scroll container cho form content

