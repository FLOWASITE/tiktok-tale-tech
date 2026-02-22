

# Fix: Form tao anh AI van khong tuong tac duoc tren mobile

## Van de goc

Sau 2 lan fix, form van khong tuong tac duoc. Phan tich ky hon cho thay co nhieu nguyen nhan cung luc:

1. **`useIsMobile()` khoi tao la `false`**: Hook bat dau voi `undefined`, va `!!undefined = false`. Lan render dau tien luon render Dialog (desktop) thay vi Drawer. Khi effect chay va chuyen sang `true`, component remount nhung Dialog da "bat" touch events roi.

2. **`touch-pan-y` han che touch**: CSS `touch-pan-y` chi cho phep vuot doc, co the gay conflict voi tap/click tren mot so trinh duyet mobile.

3. **`onPointerDownOutside`/`onInteractOutside` khong hop le tren vaul Drawer**: Vaul DrawerContent truyen tat ca props xuong, nhung nhung event handler nay co the khong hoat dong dung hoac gay side effects.

4. **DrawerOverlay chiem z-index ngang DrawerContent (ca 2 la z-50)**: Overlay co the chan touch events truoc khi chung den content.

## Giai phap

### 1. Fix `useIsMobile` de tra ve `true` ngay tu dau tren mobile (SSR-safe)

Thay `useState<boolean | undefined>(undefined)` bang check dong bo ngay:

```typescript
const [isMobile, setIsMobile] = useState<boolean | undefined>(
  typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : undefined
);
```

Nhu vay lan render dau tien tren mobile da dung Drawer.

### 2. Bo `touch-pan-y`, dung `touch-action: manipulation`

Thay `touch-pan-y` bang `touch-action: manipulation` de:
- Cho phep moi loai touch (tap, scroll, swipe)
- Loai bo 300ms tap delay tren mobile

### 3. Bo `onPointerDownOutside`/`onInteractOutside` khoi DrawerContent

Chi giu tren DialogContent (desktop). DrawerContent cua vaul xu ly dong/mo qua swipe, khong can nhung handler nay.

### 4. Them `overscroll-contain` va dam bao scroll hoat dong

Them `overscroll-behavior: contain` cho vung scroll de ngan scroll "leak" ra ngoai Drawer.

## Files thay doi

| File | Thay doi |
|------|----------|
| `src/hooks/use-mobile.tsx` | Khoi tao state dong bo thay vi `undefined` |
| `src/components/multichannel/SimpleImageGenerator.tsx` | Bo `onPointerDownOutside`/`onInteractOutside` khoi DrawerContent, thay `touch-pan-y` bang `touch-action: manipulation`, them `overscroll-contain` |

## Chi tiet ky thuat

```text
use-mobile.tsx:
  BEFORE: useState(undefined) -> first render isMobile=false -> Dialog
  AFTER:  useState(window.innerWidth < 768) -> first render isMobile=true -> Drawer

SimpleImageGenerator.tsx (mobile Drawer):
  DrawerContent:
    - BO: onPointerDownOutside, onInteractOutside
    - GIU: max-h-[90vh] overflow-hidden flex flex-col
  
  Scroll div (line 721):
    - BO: touch-pan-y
    - THEM: style={{ touchAction: 'manipulation', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
```

