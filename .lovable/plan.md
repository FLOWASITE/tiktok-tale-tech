

## Kế hoạch: Cải thiện UX PersonaSelector khi Brand không có Personas

### Mục tiêu
Khi user đã chọn Brand nhưng brand đó chưa có personas, cung cấp UX rõ ràng với CTA và fallback thay vì dead-end "Không tìm thấy".

---

### Thay đổi 1: Empty State với CTA trong PersonaSelector

**File:** `src/components/multichannel/PersonaSelector.tsx`

Thay thế `CommandEmpty` đơn giản bằng empty state có action:

```tsx
import { Users, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

// Trong CommandList, thay thế line 109:
{personas.length === 0 && !isLoading ? (
  <div className="p-4 text-center space-y-3">
    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
      <Users className="w-6 h-6 text-muted-foreground" />
    </div>
    <div className="space-y-1">
      <p className="text-sm font-medium">Chưa có Persona</p>
      <p className="text-xs text-muted-foreground">
        Thêm Customer Personas để AI hiểu rõ đối tượng mục tiêu
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
) : (
  <CommandEmpty>Không tìm thấy persona.</CommandEmpty>
)}
```

---

### Thay đổi 2: Expose personas count từ hook

**File:** `src/components/multichannel/PersonaSelector.tsx`

Export thông tin personas để parent component biết khi nào cần fallback:

```tsx
// Thêm prop callback để thông báo personas count
interface PersonaSelectorProps {
  // ...existing props
  onPersonasLoaded?: (count: number) => void;
}

// Trong component, thêm useEffect:
useEffect(() => {
  if (!isLoading && onPersonasLoaded) {
    onPersonasLoaded(personas.length);
  }
}, [personas.length, isLoading, onPersonasLoaded]);
```

---

### Thay đổi 3: Smart Fallback trong MultiChannelFormWizard

**File:** `src/components/multichannel/MultiChannelFormWizard.tsx`

**Step 2 (~line 1066-1084)** - Thêm state và logic fallback:

```tsx
// Thêm state để track personas count
const [brandPersonasCount, setBrandPersonasCount] = useState<number | null>(null);

// Trong JSX:
{brandTemplateId ? (
  brandPersonasCount === 0 ? (
    // Fallback: Textarea + hint khi brand không có personas
    <div className="space-y-2">
      <Textarea
        value={coreContentAudience}
        onChange={(e) => setCoreContentAudience(e.target.value)}
        placeholder="VD: Chủ doanh nghiệp SME, 30-45 tuổi, quan tâm đến..."
        className="min-h-[60px] text-sm resize-none"
      />
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Info className="w-3 h-3 shrink-0" />
        <span>
          <Link 
            to={`/brand-templates/${brandTemplateId}/edit?tab=personas`}
            className="underline text-primary hover:text-primary/80"
          >
            Thêm Personas cho brand
          </Link>
          {' '}để AI targeting chính xác hơn
        </span>
      </p>
    </div>
  ) : (
    <PersonaSelector
      brandTemplateId={brandTemplateId}
      value={coreContentPersonaId}
      onValueChange={(id) => setCoreContentPersonaId(id)}
      onPersonasLoaded={setBrandPersonasCount}
      disabled={isGeneratingCoreContent}
    />
  )
) : (
  <Textarea ... /> // Existing fallback khi chưa chọn brand
)}
```

---

### Thay đổi 4: Button Hint Text

**File:** `src/components/multichannel/PersonaSelector.tsx` (line 98)

Cập nhật text hiển thị khi không có personas:

```tsx
<span>
  {isLoading 
    ? "Đang tải..." 
    : personas.length === 0 
      ? "Chưa có persona" 
      : placeholder
  }
</span>
```

---

### Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/components/multichannel/PersonaSelector.tsx` | Empty state với CTA, button hint text, callback prop |
| `src/components/multichannel/MultiChannelFormWizard.tsx` | Smart fallback logic với Textarea + hint link |

---

### Kết quả mong đợi

| Scenario | Hiện tại | Sau khi implement |
|----------|----------|-------------------|
| Brand có personas | ✅ Dropdown hoạt động | Không đổi |
| Brand không có personas | ❌ "Không tìm thấy" (dead-end) | ✅ CTA "Thêm Persona" trong dropdown |
| Brand không có personas (Step 2) | ❌ PersonaSelector rỗng | ✅ Textarea fallback + hint link |
| Chưa chọn brand | ✅ Fallback Textarea | Không đổi |

