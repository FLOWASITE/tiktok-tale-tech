

## Plan: Phân biệt rõ UI giữa "Giữ Brand" và "Toàn quyền"

### Vấn đề
Sau lần sửa trước, cả 2 mode đều hiện V3StylePreview ở main area và đều ẩn Style Grid trong Advanced. Kết quả: giao diện gần như giống hệt nhau.

### Nguyên tắc phân biệt

```text
┌────────────────────┬──────────────────────────┬──────────────────────────┐
│ UI Element         │ Giữ Brand (brand_only)   │ Toàn quyền (raw)        │
├────────────────────┼──────────────────────────┼──────────────────────────┤
│ V3StylePreview     │ ✅ Hiện (AI gợi ý)      │ ❌ ẨN (user tự chọn)    │
│ Style Grid (main)  │ ❌ Ẩn                    │ ✅ HIỆN ở main area     │
│ Style Grid (adv)   │ ✅ Hiện (override AI)    │ ❌ Ẩn (đã ở main)      │
│ Logo               │ Auto-ON                  │ Manual toggle           │
│ Strategic context   │ ✅ Hiện (opacity-60)    │ ❌ Ẩn                   │
│ Negative prompt    │ ✅ Hiện                  │ ✅ Hiện                 │
│ Mode hint color    │ Amber (đã có)            │ Violet (đã có)          │
└────────────────────┴──────────────────────────┴──────────────────────────┘
```

**Ý tưởng**: "Giữ Brand" = AI gợi ý phong cách, user chọn theo gợi ý. "Toàn quyền" = user TỰ chọn từ grid, không cần AI gợi ý.

### Thay đổi — 2 files

#### File 1: `src/components/multichannel/SimpleImageGenerator.tsx`

**1a. V3StylePreview chỉ cho brand_only** (line 776):
```typescript
// Before:
{promptMode !== 'full' && v3Suggestions.length > 0 && (

// After:  
{promptMode === 'brand_only' && v3Suggestions.length > 0 && (
```

**1b. Thêm Style Grid inline cho raw mode** (sau V3StylePreview block, ~line 782):
```typescript
{promptMode === 'raw' && (
  <div className="space-y-2">
    <Label className="text-xs text-muted-foreground">Phong cách ảnh</Label>
    <div className="grid grid-cols-4 gap-1.5">
      {IMAGE_STYLES.map(s => (
        <button key={s.value} onClick={() => setImageStyle(s.value)}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs",
            imageStyle === s.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/50 hover:border-primary/30 text-muted-foreground"
          )}>
          {s.icon}
          <span className="font-medium">{s.label}</span>
        </button>
      ))}
    </div>
  </div>
)}
```

**1c. hideStyleGrid logic** (line 941):
```typescript
// Before:
hideStyleGrid={promptMode !== 'full'}

// After — hide in full (AI decides) and raw (already in main area):
hideStyleGrid={promptMode === 'full' || promptMode === 'raw'}
```

#### File 2: `src/components/multichannel/ImageAdvancedOptions.tsx`

**2a. Style Grid description** cho brand_only mode (line 212-218) — giữ nguyên nhưng thêm label rõ hơn:
```typescript
{promptMode === 'brand_only' && !hideStyleGrid && (
  // Existing style grid with subtitle:
  // "Ghi đè phong cách AI gợi ý. Chọn 'Tự động' để dùng gợi ý V3."
)}
```

Đổi description text cho brand_only (line 218):
```typescript
'Ghi đè gợi ý AI ở trên. Chọn "Tự động" để dùng phong cách AI đề xuất.'
```

### Tóm tắt thay đổi
- ~15 dòng sửa trong SimpleImageGenerator.tsx
- ~2 dòng sửa trong ImageAdvancedOptions.tsx  
- Kết quả: "Giữ Brand" có V3 gợi ý + style grid override trong Advanced. "Toàn quyền" có style grid trực tiếp ở main, không V3 gợi ý.

