
# Hoan thien he thong tao anh AI - Sua loi va cai thien con thieu

## Van de phat hien

### 1. Bug: Nut "Xem prompt" khong hoat dong
- `ImageStreamingCard` da co prop `prompt` va UI "Xem prompt"
- Nhung `ImageStreamingGrid` **KHONG truyen** prop `prompt` xuong `ImageStreamingCard`
- Ket qua: Nut "Xem prompt" khong bao gio hien thi du anh da tao xong
- Day la bug tu lan cai thien truoc, can fix ngay

### 2. Content keyword extraction chua hieu qua
- Ham `extractContentKeywords` chi bat cac cum tu viet hoa (Capitalized phrases)
- Voi noi dung tieng Viet (thuong khong viet hoa), se tra ve mang rong → preview keywords khong hien thi
- Can bo sung regex cho tieng Viet de bat keyword tot hon

## Cac thay doi

### File 1: `src/components/multichannel/streaming/ImageStreamingGrid.tsx`

**Fix bug: Truyen prop `prompt` tu `generatedImages` xuong `ImageStreamingCard`**

Tai dong 144-155, them `prompt={image?.prompt}` vao ImageStreamingCard:

```
<ImageStreamingCard
  channel={channel}
  status={status}
  imageUrl={image?.imageUrl}
  aspectRatio={image?.aspectRatio}
  prompt={image?.prompt}          // <-- THEM DONG NAY
  ...
/>
```

### File 2: `src/components/multichannel/SimpleImageGenerator.tsx`

**Cai thien `extractContentKeywords` de ho tro tieng Viet tot hon**

Ham hien tai chi bat capitalized phrases (regex uppercase). Voi noi dung tieng Viet thuong khong viet hoa, can them:
- Bat cac cum tu co dau ngoac kep
- Bat cac so lieu/con so kem context (vd: "5 cach", "top 10")
- Bat cac cum tu sau cac keyword chi dan (vd: sau "ve", "cho", "cua")
- Fallback: neu khong tim thay gi, lay 3-5 tu dau tien cua topic lam keyword

## Chi tiet ky thuat

| Thay doi | File | Dong | Mo ta |
|----------|------|------|-------|
| Fix prompt prop | ImageStreamingGrid.tsx | 144-155 | Them `prompt={image?.prompt}` |
| Keyword extraction VN | SimpleImageGenerator.tsx | 67-78 | Cai thien regex cho tieng Viet |

## Khong thay doi
- Backend edge functions
- Database / RLS
- Cac component khac
- Logic tao anh, batch generation
