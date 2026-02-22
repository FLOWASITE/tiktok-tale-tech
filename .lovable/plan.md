

# Fix: Anh da tao nhung chua hien tren mockup

## Nguyen nhan

Khi tao anh, he thong dang o che do "Preview truoc, luu sau":
- Anh duoc tao xong va hien trong luoi preview ben trong dialog
- Nhung anh CHUA duoc luu vao database hoac cap nhat len mockup
- Nguoi dung phai bam nut "Luu tat ca" de luu anh
- Neu dong dialog ma khong bam "Luu tat ca", tat ca anh bi mat

## Giai phap

Chuyen sang che do tu dong luu: anh duoc luu ngay khi tao xong, khong can bam them nut nao.

### File thay doi

| File | Thay doi |
|------|----------|
| `src/components/multichannel/SimpleImageGenerator.tsx` | Doi `saveImmediately` tu `false` sang `true`, bo nut "Luu tat ca" |

### Chi tiet

1. **Dong 311**: Doi `generateAllImages(batchOptions, onImageGenerated, false)` thanh `generateAllImages(batchOptions, onImageGenerated, true)`
   - Moi anh se duoc luu vao database ngay khi tao xong
   - Mockup se cap nhat ngay lap tuc nho `setGeneratedImages` trong callback `onImageGenerated`

2. **Bo nut "Luu tat ca"** (dong 517-527): Khong can nut luu nua vi anh da duoc luu tu dong. Giu lai nut "Tao lai" de nguoi dung co the tao lai neu khong hai long.

3. **Bo ham `handleSaveAll`** (dong 315-321): Khong con can thiet.

### Ket qua

- Nguoi dung bam "Tao anh" -> anh duoc tao va tu dong luu -> mockup cap nhat ngay
- Dong dialog bat ky luc nao ma khong mat anh

