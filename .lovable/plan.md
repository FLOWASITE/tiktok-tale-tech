

## Kế hoạch: Cải thiện UX PersonaSelector khi không có Personas

### Vấn đề hiện tại
Brand template đang được chọn (`4d7e0d97-bc99-4fd2-ad08-514c8a1ab969`) **chưa có personas nào** trong database. UI hiện tại:
- Hiển thị "Không tìm thấy persona" trong dropdown
- Không có hướng dẫn hoặc action tiếp theo

### Giải pháp đề xuất

#### Thay đổi 1: Empty State với CTA rõ ràng

**File:** `src/components/multichannel/PersonaSelector.tsx`

Thêm empty state thông minh trong PopoverContent:

```tsx
{personas.length === 0 && !isLoading && (
  <div className="p-4 text-center space-y-3">
    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
      <Users className="w-6 h-6 text-muted-foreground" />
    </div>
    <div className="space-y-1">
      <p className="text-sm font-medium">Chưa có Persona</p>
      <p className="text-xs text-muted-foreground">
        Thêm Customer Personas để AI hiểu rõ đối tượng mục tiêu của bạn
      </p>
    </div>
    <Button
      variant="outline"
      size="sm"
      className="w-full gap-2"
      asChild
    >
      <Link to={`/brand-templates/${brandTemplateId}/edit?tab=personas`}>
        <Plus className="w-4 h-4" />
        Thêm Persona
      </Link>
    </Button>
  </div>
)}
```

#### Thay đổi 2: Hint text khi hover button rỗng

Khi chưa có personas, button hiển thị hint nhẹ:

```tsx
<span>{isLoading ? "Đang tải..." : personas.length === 0 ? "Chưa có persona (click để thêm)" : placeholder}</span>
```

#### Thay đổi 3: Fallback về Textarea kèm gợi ý

**File:** `src/components/multichannel/MultiChannelFormWizard.tsx`

Trong Step 2, nếu brand có nhưng không có personas, hiển thị Textarea + gợi ý:

```tsx
{brandTemplateId && personas.length === 0 ? (
  <div className="space-y-2">
    <Textarea
      value={coreContentAudience}
      onChange={(e) => setCoreContentAudience(e.target.value)}
      placeholder="VD: Chủ doanh nghiệp SME, 30-45 tuổi..."
      className="min-h-[60px] text-sm resize-none"
    />
    <p className="text-xs text-muted-foreground flex items-center gap-1">
      <Info className="w-3 h-3" />
      <Link to={`/brand-templates/${brandTemplateId}/edit?tab=personas`} className="underline text-primary">
        Thêm Personas cho brand
      </Link>
      {' '}để AI targeting chính xác hơn
    </p>
  </div>
) : (
  <PersonaSelector ... />
)}
```

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/multichannel/PersonaSelector.tsx` | Thêm empty state với CTA "Thêm Persona" |
| `src/components/multichannel/MultiChannelFormWizard.tsx` | Fallback thông minh khi brand không có personas |

### Kết quả mong đợi

| Scenario | Hiện tại | Sau khi fix |
|----------|----------|-------------|
| Brand có personas | Dropdown hoạt động | Không đổi |
| Brand không có personas | "Không tìm thấy" (dead-end) | CTA "Thêm Persona" + Textarea fallback |
| Chưa chọn brand | Fallback Textarea | Không đổi |

