## Vấn đề

Icon Zalo hiện tại trong `src/components/icons/SocialIcons.tsx` đang dùng path **wordmark Zalo lồng trong speech bubble** (logo app cũ, có background bubble + chữ Zalo + 2 dấu chấm). Khi render ở size nhỏ (16-20px) trong landing page và channel cards, các chi tiết bị nén lại trông rối, không rõ là Zalo.

## Giải pháp

Thay path SVG bằng phiên bản **Simple Icons (CC0, brand-approved)** — chỉ là wordmark "Zalo" cách điệu sạch sẽ, đúng tỉ lệ viewBox 24×24, render rõ ở mọi size. Đây là phiên bản chuẩn được dùng bởi simple-icons (24,000+ stars), ProIcons, SVGRepo.

### So sánh

| | Hiện tại | Mới (Simple Icons) |
|---|---|---|
| Style | Wordmark + speech bubble + chấm | Wordmark "Zalo" cách điệu |
| Path size | ~1.6 KB | ~0.9 KB |
| Render @16px | Rối, khó nhận | Rõ, đọc được "Zalo" |
| License | Custom path | CC0-1.0 |

## Phạm vi sửa

**1 file duy nhất:** `src/components/icons/SocialIcons.tsx` — function `ZaloIcon` (line 3-11):
- Giữ nguyên signature, viewBox `0 0 24 24`, `fill="currentColor"`
- Thay nội dung `<path d="..."/>` bằng path Simple Icons:
  ```
  M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z
  ```
- Cập nhật JSDoc thành `/** Zalo official wordmark logo (Simple Icons CC0) */`

## Tác động lan tỏa

Tất cả nơi import `ZaloIcon` từ `@/components/icons/SocialIcons` sẽ tự động dùng icon mới — không cần sửa thêm:
- `src/components/icons/SocialIcons.tsx` — định nghĩa
- `src/components/multichannel/streaming/ChannelIcon.tsx`
- `src/components/MultiChannelForm.tsx`, `MultiChannelFormStepper.tsx`, `MultiChannelFormWizard.tsx`
- `src/components/brand/BrandViewChannelsTab.tsx`
- `src/components/admin/ai/AIChannelModelConfig.tsx`
- `src/landing/components/SocialChannelsSection.tsx` (vừa tạo)

Không động DB, edge function, hay logic nào khác.
