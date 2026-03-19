

# Fix: Các slide bị lặp lại quá nhiều — Thêm quy tắc phân biệt slide

## Nguyên nhân gốc

Trong `generate-carousel/index.ts`, hệ thống prompt có **5 quy tắc về sự đồng nhất** (cùng palette, cùng setting, cùng ánh sáng, cùng phong cách, cùng thế giới) nhưng **KHÔNG CÓ quy tắc nào về sự phân biệt** giữa các slide.

Kết quả: Gemini tạo ra các `fullPrompt` gần giống nhau cho tất cả slides — cùng góc chụp, cùng chủ thể, cùng bố cục → ảnh lặp lại.

Thêm vào đó, Series Bible trong `CarouselGenerationTracker.tsx` và `seamlessDirective` trong `generate-carousel-image/index.ts` tiếp tục nhấn mạnh "same environment, same lighting" mà không yêu cầu sự đa dạng.

## Giải pháp: Thêm quy tắc DIFFERENTIATION ở cả 2 tầng

### Tầng 1: Prompt tạo nội dung (`generate-carousel/index.ts`)

Thêm section **"QUY TẮC PHÂN BIỆT GIỮA CÁC SLIDE"** ngay sau "QUY TẮC THỐNG NHẤT HÌNH ẢNH":

```
## QUY TẮC PHÂN BIỆT GIỮA CÁC SLIDE (QUAN TRỌNG NHƯ QUY TẮC THỐNG NHẤT)

Mặc dù tất cả slides cùng "thế giới hình ảnh", MỖI SLIDE PHẢI CÓ:

1. GÓC CHỤP KHÁC NHAU: wide shot → medium → close-up → overhead → side angle. 
   KHÔNG được 2 slide liền nhau có cùng camera angle.

2. CHỦ THỂ/FOCAL POINT KHÁC NHAU: Mỗi slide focus vào 1 yếu tố khác 
   trong cùng thế giới. VD spa: slide 1 = toàn cảnh phòng, slide 2 = 
   close-up đá nóng, slide 3 = tay massage, slide 4 = sản phẩm tinh dầu.

3. BỐ CỤC KHÁC NHAU: Xen kẽ rule of thirds, centered, asymmetric, 
   negative space left/right. Không 2 slide cùng bố cục.

4. KHOẢNG CÁCH KHÁC NHAU: Xen kẽ establishing shot, medium shot, 
   detail/macro shot để tạo nhịp thị giác.

5. Trong fullPrompt, CHỈ RÕ: "[camera angle] + [focal subject] + [composition]" 
   ĐẦU TIÊN, trước phần mô tả chi tiết.

VÍ DỤ TỐT (Topic: "5 Tips Marketing cho Spa"):
- Slide 1: "Wide establishing shot of luxury spa reception..."
- Slide 2: "Close-up overhead view of essential oil bottles..."  
- Slide 3: "Medium shot from side angle, therapist hands..."
- Slide 4: "Detail macro shot of hot stones on wooden tray..."
- Slide 5: "Wide low-angle shot of spa garden entrance..."

VÍ DỤ XẤU (tất cả lặp lại):
- Slide 1: "Spa treatment room with candles..."
- Slide 2: "Spa treatment area with oils..."
- Slide 3: "Spa massage room with stones..."
```

Cập nhật Luật #6 trong fullPrompt rules:

```
6. Mỗi fullPrompt KẾT THÚC bằng: "consistent with previous slides: [phong cách chung]. 
   THIS SLIDE UNIQUE ELEMENT: [yếu tố riêng biệt của slide này]"
```

### Tầng 2: Series Bible (`CarouselGenerationTracker.tsx`)

Thêm dòng differentiation vào `buildSeriesBible`:

```
`Each slide uses a DIFFERENT camera angle, focal subject, and composition 
while staying in the same visual world.`
```

### Tầng 3: Image prompt (`generate-carousel-image/index.ts`)

Thêm DIFFERENTIATION directive vào `buildBackgroundPrompt`, sử dụng `slideObjective` để ép sự khác biệt:

```
SLIDE UNIQUENESS: This is slide ${pos} of ${total}. 
Use a DIFFERENT camera angle and focal subject than other slides. 
This slide's unique focus: "${slideObjective}".
```

## Tóm tắt files thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/generate-carousel/index.ts` | Thêm section "QUY TẮC PHÂN BIỆT" + cập nhật Luật #6 |
| `src/components/carousel/CarouselGenerationTracker.tsx` | Thêm differentiation line vào Series Bible |
| `supabase/functions/generate-carousel-image/index.ts` | Thêm SLIDE UNIQUENESS directive |

## Kết quả mong đợi

- Mỗi slide có góc chụp, chủ thể, bố cục khác nhau rõ rệt
- Vẫn giữ tính đồng nhất về palette, lighting, mood
- Carousel trông như "bộ ảnh chuyên nghiệp" thay vì "1 ảnh copy 7 lần"

