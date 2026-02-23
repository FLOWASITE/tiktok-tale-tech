

# Hoan thien UI/UX Tao noi dung da kenh - Tich hop Auto Image Pipeline

## Van de hien tai

Sau khi trien khai Auto Image Pipeline (Phase 1 + 2), con ton tai **3 lo hong UI/UX**:

1. **MobileGenerationSheet khong hien thi tien do tao anh** - Tren mobile, sau khi text hoan thanh, user chi thay "Tao thanh cong!" nhung khong biet anh dang duoc tu dong tao
2. **CreatePreviewPanel chuyen trang thai dot ngot** - Text xong → nhay ngay sang "Hoan thanh" mà khong co giai doan chuyen tiep "Dang tao anh..."
3. **Khong co cach retry/download anh tu trang Create** - ImageStreamingGrid hien tai khong truyen callback retry/download tu page chinh

## Pham vi thay doi

### 1. MobileGenerationSheet - Them Image Pipeline (Uu tien cao)

Them props image pipeline vao `MobileGenerationSheet.tsx` de mobile users cung thay duoc tien do tao anh:

- Them props: `imagePhase`, `imageProgress`, `imageProgressTimes`, `generatedImages`, `imageCompletedCount`, `imageTotalCount`
- Khi `generationState === 'complete'` va `imagePhase === 'generating_images'`:
  - Hien thi `ImageStreamingGrid` compact (1 cot tren mobile)
  - Thay title thanh "Dang tao anh AI..." thay vi "Tao thanh cong!"
  - Them progress bar cho anh
- Khi ca text va anh deu xong: hien "Hoan thanh!" voi summary

### 2. CreatePreviewPanel - Cai thien transition (Uu tien cao)

Cap nhat `CreatePreviewPanel.tsx`:

- Khi `state === 'complete'` va `imagePhase === 'generating_images'`: Hien thi 2 phan:
  - Mini success header (nho gon) cho text
  - ImageStreamingGrid lam phan chinh (chiem nhieu khong gian hon)
- Khi tat ca xong: Hien thi summary tong hop (text + anh) voi action buttons

### 3. MultiChannelCreate - Truyen du props (Uu tien cao)

Cap nhat `MultiChannelCreate.tsx`:

- Truyen image pipeline props xuong `MobileGenerationSheet`
- Them `logoOverlayFailures` vao CreatePreviewPanel props

## Chi tiet ky thuat

### File 1: `src/components/multichannel/MobileGenerationSheet.tsx`

- Import `ImageStreamingGrid`, `ImageGenerationStatus`, `GeneratedImage`, `PipelinePhase`
- Them 6 props moi cho image pipeline
- Them trang thai "generating_images" trong phan complete:
  - Title: "Dang tao anh AI..."
  - ImageStreamingGrid voi grid 1 cot (mobile-optimized)
  - Progress: `imageCompletedCount/imageTotalCount kenh`
- Khong cho dong drawer khi dang tao anh

### File 2: `src/components/multichannel/CreatePreviewPanel.tsx`

- Them prop `logoOverlayFailures` (optional)
- Khi complete + dang tao anh:
  - Thu nho text success header (icon + text 1 dong thay vi card lon)
  - ImageStreamingGrid chiem phan lon khong gian
  - Action buttons van hien nhung co badge "Dang tao anh..." de user biet co the xem truoc
- Khi complete + anh xong:
  - Summary: "X kenh noi dung + Y kenh anh"
  - Action buttons nhu cu

### File 3: `src/pages/MultiChannelCreate.tsx`

- Truyen them image pipeline props xuong MobileGenerationSheet:
  - `imagePhase={imagePipeline.phase}`
  - `imageProgress={imagePipeline.imageProgress}`
  - `imageProgressTimes={imagePipeline.imageProgressTimes}`
  - `generatedImages={imagePipeline.generatedImages}`
  - `imageCompletedCount={imagePipeline.imageCompletedCount}`
  - `imageTotalCount={imagePipeline.imageTotalCount}`
  - `logoOverlayFailures={imagePipeline.logoOverlayFailures}`
- Truyen `logoOverlayFailures` xuong CreatePreviewPanel

### Khong thay doi:
- `ImageStreamingCard.tsx` - Da tot, khong can sua
- `ImageStreamingGrid.tsx` - Da tot, khong can sua
- `useAutoImagePipeline.ts` - Khong can thay doi logic
- `useAutoImageGeneration.ts` - Khong can thay doi logic

## Ket qua mong doi

- Mobile users thay tien do tao anh real-time trong drawer
- Desktop users thay chuyen tiep muot tu text → anh trong preview panel
- Trai nghiem lien tuc, khong bi gian doan giua 2 giai doan

