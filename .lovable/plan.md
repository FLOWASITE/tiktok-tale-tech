

## Plan: Ẩn manual toggles khi "Để AI lo" + Auto-enable hybrid/ai_render

### Vấn đề
Khi `promptMode === 'full'`, user vẫn thấy 3 controls thủ công: Hybrid checkbox, AI Render toggle, Template Picker. Theo logic đã approved, "Để AI lo" phải tự động bật hybrid + ai_render và ẩn các controls này.

### Thay đổi — 1 file: `SimpleImageGenerator.tsx`

**1. Thêm `useEffect` auto-enable khi full mode**
```typescript
useEffect(() => {
  if (promptMode === 'full') {
    setUseHybridMode(true);
    setOverlayMode('ai_render');
  } else {
    setOverlayMode('satori');
  }
}, [promptMode]);
```

**2. Ẩn manual controls khi full mode**

Wrap block hybrid toggle (dòng ~818-858) với điều kiện `promptMode !== 'full'`:
```typescript
{promptMode !== 'full' && complexityAnalysis.score !== 'simple' && (
  <div className="space-y-2">
    {/* Hybrid checkbox, AI Render toggle, Template Picker — chỉ hiện khi brand_only/raw */}
    ...
  </div>
)}
```

**3. Thêm info note khi full mode**

Hiển thị note nhỏ thay thế controls:
```typescript
{promptMode === 'full' && (
  <p className="text-xs text-primary/70 bg-primary/5 border border-primary/15 rounded-lg px-3 py-2">
    🤖 AI tự động chọn layout + render text trực tiếp trong ảnh
  </p>
)}
```

### Scope
- ~15 dòng thay đổi, 1 file
- Không ảnh hưởng pipeline — chỉ thay đổi UI visibility + default state

