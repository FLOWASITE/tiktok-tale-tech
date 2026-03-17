

# Hoàn thiện nội dung Landing Page Flowa

## Phân tích hiện trạng

Sau khi review toàn bộ codebase, landing page có các vấn đề cần hoàn thiện:

### 1. TestimonialsSection không được sử dụng
- Component `TestimonialsSection` được export trong `index.ts` nhưng **không import vào `Landing.tsx`**
- `SocialProofSection` hiện tại đã chứa 3 reviews từ testimonials, nhưng section Testimonials riêng (với marquee animation đẹp) bị bỏ sót

### 2. Nội dung chưa thuyết phục & thiếu thực tế
- **Trust logos**: Đang dùng tên giả "VinGroup, FPT, Shopee, Tiki, Sendo, MoMo" - chưa có khách hàng thật
- **Testimonials**: 6 đánh giá với công ty giả "TechViet, StartupXYZ, E-commerce Plus, Agency Pro, Beauty Corp, Digital Studio"
- **Stats**: "10,000+ Marketer", "500K+ Content" - con số chưa phản ánh thực tế sản phẩm mới

### 3. Nội dung cần cải thiện
- **SocialProofSection**: Metric "Uptime 99.9%" và "Enterprise-grade reliability" chưa được dịch sang tiếng Việt
- **Hero description**: Khá generic, chưa nêu rõ điểm khác biệt cốt lõi (Industry Compliance, Multi-agent AI)
- **FAQ**: Có 8 câu hỏi nhưng thiếu câu hỏi về bảo mật doanh nghiệp, team collaboration, so sánh với đối thủ
- **Pricing**: Giá cần cập nhật phù hợp thực tế (990K/tháng cho Professional)

## Kế hoạch thực hiện

### A. Cập nhật Landing.tsx - Thêm TestimonialsSection
- Import và thêm `TestimonialsSection` vào sau `SocialProofSection`

### B. Cập nhật vi.json - Hoàn thiện nội dung tiếng Việt
1. **Hero**: Cập nhật description nhấn mạnh USP (Industry Compliance AI, Multi-channel trong 10 phút)
2. **Hero stats**: Điều chỉnh con số thực tế hơn cho giai đoạn early stage
3. **Trust logos**: Thay thế bằng mô tả ngành thay vì tên công ty cụ thể (hoặc bỏ đi nếu chưa có khách hàng thật)
4. **SocialProof**: Dịch "Uptime" và "Enterprise-grade reliability" sang tiếng Việt
5. **Testimonials**: Cập nhật nội dung testimonials thực tế hơn, phản ánh use cases thật
6. **FAQ**: Thêm 2-3 câu hỏi mới về bảo mật doanh nghiệp, so sánh với đối thủ, hỗ trợ team
7. **CTA**: Tăng tính urgency, nhấn mạnh giá trị cụ thể

### C. Cập nhật en.json - Đồng bộ nội dung tiếng Anh

### D. Cập nhật Components
1. **HeroSection.tsx**: Thay trust logos bằng industry badges (thay vì tên công ty chưa xác thực)
2. **SocialProofSection.tsx**: Dịch hardcoded English text

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/pages/Landing.tsx` | Thêm TestimonialsSection |
| `src/i18n/locales/vi.json` | Cập nhật nội dung hero, stats, testimonials, FAQ, CTA |
| `src/i18n/locales/en.json` | Đồng bộ nội dung tiếng Anh |
| `src/components/landing/HeroSection.tsx` | Thay trust logos bằng industry/use-case badges |
| `src/components/landing/SocialProofSection.tsx` | Dịch hardcoded text, cải thiện metrics |

