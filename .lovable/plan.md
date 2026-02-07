

# Kế hoạch: Cải thiện UI cho Hook Suggestion - Nổi bật & Mở sẵn

## Mục tiêu
- **Mở mặc định** (không cần click để xem)
- **UI nổi bật hơn** - Thay vì Button đơn giản, chuyển thành Card với visual attention
- Giữ nguyên toàn bộ logic và tính năng hiện có

## Phân tích hiện tại

Hiện tại trong `MultiChannelHookGenerator.tsx`:
```typescript
const [isOpen, setIsOpen] = useState(false); // ← Mặc định đóng
```

UI trigger là một button outline với border dashed nhỏ, dễ bị bỏ qua.

## Thay đổi đề xuất

### 1. Mặc định mở (defaultOpen = true)
```typescript
const [isOpen, setIsOpen] = useState(true); // Mở sẵn
```

### 2. Chuyển trigger thành Card nổi bật

Thay vì:
```text
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│ 💡 Gợi ý Opening Hook    [3 hook] ▼│
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
```

Đổi thành Card với gradient và icon animated:
```text
┌───────────────────────────────────────────────────────┐
│ ✨ 💡 GỢI Ý HOOK THU HÚT                        [▲]  │
│ ──────────────────────────────────────────────────── │
│ AI đề xuất câu mở đầu hấp dẫn cho từng kênh         │
│ [3 hook sẵn sàng]                                    │
└───────────────────────────────────────────────────────┘
```

### 3. Visual improvements

- **Background gradient**: `bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50` (light) / tương đương dark
- **Icon animated**: Lightbulb với pulse effect
- **Badge nổi bật**: Hiển thị số hook với màu amber/gold
- **Border highlighted**: `border-amber-300/50` thay vì dashed mờ

## Chi tiết kỹ thuật

### File: `src/components/multichannel/MultiChannelHookGenerator.tsx`

**Thay đổi 1 - Mở mặc định:**
```typescript
// Dòng 161
const [isOpen, setIsOpen] = useState(true); // Thay false → true
```

**Thay đổi 2 - Redesign trigger thành Card:**

```typescript
<Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
  {/* NEW: Card-based trigger thay vì Button */}
  <Card className={cn(
    "overflow-hidden transition-all duration-300",
    "border-2",
    isOpen 
      ? "border-amber-400/50 shadow-md shadow-amber-100/50 dark:shadow-amber-900/20" 
      : "border-amber-300/30 hover:border-amber-400/50",
    "bg-gradient-to-r from-amber-50/80 via-yellow-50/50 to-orange-50/80",
    "dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-orange-950/30"
  )}>
    <CollapsibleTrigger asChild>
      <div className="p-4 cursor-pointer group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Animated icon */}
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                Gợi ý Opening Hook
                {hooks.length > 0 && (
                  <Badge className="bg-amber-500 text-white border-0 text-xs">
                    {hooks.length} hook
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                AI đề xuất câu mở đầu thu hút cho từng kênh
              </p>
            </div>
          </div>
          
          {/* Toggle icon */}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-amber-600 dark:text-amber-400"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </div>
      </div>
    </CollapsibleTrigger>
    
    <CollapsibleContent>
      {/* Nội dung hiện tại giữ nguyên */}
    </CollapsibleContent>
  </Card>
</Collapsible>
```

## Kết quả mong đợi

| Trước | Sau |
|-------|-----|
| Button nhỏ, dashed border | Card lớn, gradient background |
| Mặc định đóng | Mặc định mở |
| Icon tĩnh | Icon animated với pulse |
| Không có mô tả | Có subtitle giải thích |
| Dễ bị bỏ qua | Nổi bật, thu hút chú ý |

## Files cần chỉnh sửa

| File | Thay đổi |
|------|----------|
| `src/components/multichannel/MultiChannelHookGenerator.tsx` | Thay `isOpen` default, redesign trigger |

## Lợi ích

1. **Visibility cao hơn** - Người dùng thấy ngay tính năng hay
2. **Onboarding tốt hơn** - Mở sẵn giúp người dùng khám phá
3. **Professional look** - Card với gradient trông premium hơn
4. **Consistent với design system** - Phong cách tương tự các Card khác trong wizard

