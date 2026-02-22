

# Fix: Nut "Tao anh AI" bi an tren man hinh nho

## Van de
Nut "Tao anh AI" nam trong thanh cong cu (toolbar Row 2) cua MultiChannelViewer. Tren man hinh rong (1920px), nut hien thi binh thuong. Nhung tren man hinh hep (mobile, tablet), thanh cong cu bi tran (overflow hidden) va nut "Tao anh AI" bi day ra ngoai man hinh, nguoi dung khong the nhan thay hoac bam vao.

## Giai phap

### 1. Them thanh cuon ngang cho toolbar Row 2
File: `src/components/MultiChannelViewer.tsx` (dong 804)

Thanh cong cu hien tai dung `flex items-center justify-between` nhung khong co `overflow-x-auto`. Se them kha nang cuon ngang de cac nut khong bi cat:
- Them `overflow-x-auto` cho container cua grouped actions (phan ben phai)
- Them `flex-shrink-0` cho nut "Tao anh AI" de dam bao no khong bi thu nho

### 2. Them nut "Tao anh" vao menu 3 cham tren mobile
De dam bao tinh truy cap tot nhat, se kiem tra xem co dropdown menu nao cho cac hanh dong tren mobile khong. Neu khong, se them nut "Tao anh AI" o vi tri de nhin hon tren man hinh nho - cu the la di chuyen no vao ben trong nhom nut (grouped actions) thay vi de ngoai.

### 3. Dam bao nut ImagePlus trong noi dung kenh cung hien thi tren mobile
Kiem tra va dam bao nut tao anh per-channel (ImagePlus icon, dong 1276) khong bi an tren mobile.

## Chi tiet ky thuat

### File chinh: `src/components/MultiChannelViewer.tsx`

**Thay doi 1 - Dong 804:** Them `overflow-x-auto` va `scrollbar-hide` cho phan Right actions trong toolbar Row 2 de thanh cong cu co the cuon ngang tren man hinh nho.

**Thay doi 2 - Dong 898-907:** Di chuyen nut "Tao anh AI" vao ben trong nhom nut `bg-background/50 border border-border/30` (dong 822) de no khong bi tach rieng va de bi cat. Dong thoi them `flex-shrink-0` cho nut nay.

**Thay doi 3:** Them CSS utility `scrollbar-hide` (neu chua co) de an thanh cuon ngang nhung van cho phep cuon bang tay tren mobile.

## Ket qua mong doi
- Tren desktop: khong thay doi gi, nut "Tao anh AI" hien thi nhu binh thuong
- Tren mobile/tablet: thanh cong cu co the cuon ngang, nut "Tao anh AI" co the truy cap duoc bang cach vuot sang phai, hoac nam trong nhom nut de nhin thay hon

