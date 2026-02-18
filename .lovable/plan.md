

# Danh gia & Hoan thien he thong tao anh AI (SimpleImageGenerator)

## Trang thai hien tai

SimpleImageGenerator da duoc xay dung voi triet ly "One-Click First, Customize Later" va hoat dong co ban. Sau khi review toan dien code va UI, toi phat hien cac van de can hoan thien:

---

## 1. Cac van de can sua

### 1.1. Thieu xu ly loi `useBackgroundGeneration` (CRITICAL)
Console logs cho thay loi lien tuc:
- `useBackgroundGeneration Error fetching tasks: Failed to fetch`
- `Realtime status: CHANNEL_ERROR` (lap lai 7 lan)

Can fix realtime subscription de khong spam console va khong anh huong UX.

### 1.2. Khong co loading state khi dialog mo
Khi mo dialog, khong co skeleton/placeholder cho channel picker. Neu `content.selected_channels` load cham, UI se trong.

### 1.3. Thieu validation UX cho brand template
Hien tai chi hien toast error "Vui long chon brand template truoc" khi nhan nut. Can hien thi warning noi bat ngay trong dialog de user biet truoc khi nhan nut.

### 1.4. Text auto-fill chi chay 1 lan
`useEffect` auto-fill text chỉ chạy khi `textToInclude` rỗng. Nếu user xóa text rồi chuyển channel, text không tự fill lại. Can them nut "Dung Hook" de user chu dong fill lai.

### 1.5. Thieu per-channel text (da co trong hook nhung chua dung)
`useAutoImageGeneration` ho tro `textsPerChannel` nhung `SimpleImageGenerator` chi gui `textToInclude` (shared text). Can them option cho phep user chon "Chung cho tat ca" hoac "Tuy chinh theo kenh".

### 1.6. Khong co preview truoc khi tao
User khong biet anh se trong nhu the nao truoc khi nhan "Tao". Can them 1 dong tom tat: "Phong cach: Minimalist | Ti le: Auto | Logo: Co" de user biet AI se dung gi.

### 1.7. Dialog khong responsive tren mobile
Dialog `sm:max-w-lg` chuyen sang `sm:max-w-3xl` khi streaming. Tren mobile nho, ScrollArea co the bi cat.

---

## 2. Tinh nang thieu so voi UnifiedImageGenerator (legacy)

| Tinh nang | UnifiedImageGenerator | SimpleImageGenerator | Trang thai |
|-----------|----------------------|---------------------|-----------|
| Batch mode | Co | Co | OK |
| Single mode (prompt tu nhap) | Co | Khong (by design) | OK - da loai bo |
| Per-channel text | Co (textsPerChannel) | Khong | **Can them** |
| "Dung Hook" button | Co | Khong | **Can them** |
| StrategicContextPreview | Co | Khong | **Can them** (trong Advanced) |
| AI Style Suggestions badge | Co | Co (trong Advanced) | OK |
| Canvas Fallback toggle | Co (hien thi) | Co (an, mac dinh bat) | OK |
| Background editor | Co | Co | OK |

---

## 3. Ke hoach hoan thien

### Buoc 1: Them nut "Dung Hook" va smart refill
- Them Button "Dung Hook" ben canh "AI Toi uu" trong phan text input
- Khi nhan: auto-fill text tu `getBestOverlayText` cho channel dang chon

### Buoc 2: Them Settings Summary (1 dong tom tat)
- Hien thi ngay tren nut CTA: "Minimalist | 16:9 | Logo bottom-right"
- Giup user biet AI se dung gi ma khong can mo Advanced Options

### Buoc 3: Them per-channel text option
- Them toggle "Chung / Tuy chinh" trong phan text
- Neu chon "Tuy chinh": hien tabs theo kenh da chon, moi tab 1 textarea
- Map sang `textsPerChannel` trong batchOptions

### Buoc 4: Them StrategicContextPreview vao Advanced Options
- Di chuyen StrategicContextPreview vao ben trong Collapsible
- Hien thi content_role, content_angle, hook nhu badges mau sac

### Buoc 5: Fix brand template warning
- Neu `content.brand_template_id` khong co, hien Alert component trong dialog thay vi chi toast khi nhan nut

### Buoc 6: Fix useBackgroundGeneration realtime errors
- Them error handling/retry logic cho realtime subscription
- Giam tan suat log spam

### Buoc 7: Mobile responsive
- Dam bao dialog hoat dong tot tren viewport 375px
- Test ScrollArea tren mobile

---

## Chi tiet ky thuat

### File can sua:

**`src/components/multichannel/SimpleImageGenerator.tsx`**
- Them "Dung Hook" button (line ~400-420)
- Them Settings Summary component truoc CTA button (line ~423)
- Them per-channel text toggle + tabs (line ~400)
- Them brand template warning Alert (line ~360)

**`src/components/multichannel/ImageAdvancedOptions.tsx`**
- Import va them `StrategicContextPreview` vao cuoi CollapsibleContent

**`src/hooks/useBackgroundGeneration.ts`** (neu co)
- Fix realtime subscription error handling

### File moi:
- **`src/components/multichannel/ImageSettingsSummary.tsx`**: Component 1 dong hien thi settings hien tai (style, ratio, logo, text)

---

## Uu tien thuc hien

1. **Cao**: Buoc 1 (Hook button) + Buoc 2 (Settings Summary) - UX quan trong nhat
2. **Cao**: Buoc 5 (Brand template warning) - tranh confuse user
3. **Trung binh**: Buoc 3 (Per-channel text) - power user feature
4. **Thap**: Buoc 4 (Strategic preview) + Buoc 6 (Realtime fix) + Buoc 7 (Mobile)

