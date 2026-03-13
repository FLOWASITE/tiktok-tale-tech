
## Fix: Form tao anh AI hien thi day du noi dung tren Desktop

### Van de
Dialog "Tao anh AI" tren desktop bi che mat noi dung, dac biet phan "Tuy chinh nang cao" (ImageAdvancedOptions). Nguyen nhan: `ScrollArea` cua Radix khong tu dong fill dung height trong flex container khi chi dung `h-full` -- can them CSS cu the de Viewport cua ScrollArea stretch dung cach.

### Giai phap
Thay doi cach bo tri layout cua Dialog de dam bao scroll hoat dong dung:

**File: `src/components/multichannel/SimpleImageGenerator.tsx`**

1. **Tang max-h cua DialogContent** tu `90vh` len `92vh` de tan dung toi da khong gian man hinh.

2. **Fix ScrollArea layout**: Thay `overflow-hidden` bang cach dung CSS truc tiep -- dat `bodyContent` wrapper thanh flex-1 voi `overflow-y: auto` thay vi dua vao ScrollArea cua Radix (von khong tu dong stretch trong flex context).

Cu the:
- Bo `ScrollArea` wrapper trong `bodyContent` (desktop)
- Thay bang `div` voi `className="flex-1 min-h-0 overflow-y-auto pr-3"` de native scroll hoat dong dung trong flex column layout
- Giu nguyen `ScrollArea` cho mobile (da hoat dong tot)

### Chi tiet ky thuat

```typescript
// bodyContent - thay doi:
const bodyContent = (
  <div className="flex-1 min-h-0 overflow-y-auto pr-2">
    {viewMode === 'setup' && setupFields}
    {(viewMode === 'streaming' || viewMode === 'preview') && streamingPreviewContent}
  </div>
);
```

Va DialogContent:
```typescript
className={cn(
  "transition-all duration-300 max-h-[92vh] overflow-hidden flex flex-col",
  viewMode === 'setup' ? "sm:max-w-3xl" : "sm:max-w-5xl"
)}
```

### Pham vi thay doi
- 1 file: `src/components/multichannel/SimpleImageGenerator.tsx`
- Thay doi ~10 dong code
- Khong anh huong den mobile (giu nguyen `mobileBodyContent`)
