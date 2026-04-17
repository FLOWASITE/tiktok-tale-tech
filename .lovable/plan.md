

User đã có dữ liệu 5 personas chi tiết cho ngành Thẩm mỹ Việt Nam. Cần insert vào database `industry_personas_v2` + `industry_persona_translations_v2`.

## Kế hoạch: Import 5 Vietnam Beauty Personas vào Industry Memory

### Bước 1: Xác định Global Pack ID
Query `industry_global_packs` tìm pack với `industry_code = 'beauty_cosmetics'` (hoặc tương đương). Nếu chưa có, sẽ tạo mới với `target_audience = 'B2C'`.

### Bước 2: Insert 5 Personas vào `industry_personas_v2`
Mỗi persona sẽ được map từ JSON nghiên cứu sang schema DB:

| Persona | name | age_range | income | communication_style |
|---|---|---|---|---|
| 1 | Linh Văn Phòng | 25-32 | medium-high | emotional |
| 2 | Cô Hương Trung Niên | 35-50 | high | analytical |
| 3 | Mẹ Trang Bỉm Sữa | 28-38 | medium | empathetic |
| 4 | Chị Mai CEO | 40-55 | very_high | consultative |
| 5 | Anh Tuấn Nam Giới | 28-42 | high | direct |

Các field map:
- `pain_points`, `goals`, `objections` → từ customer_journey (gộp từ 4 stages)
- `values`, `interests`, `personality_traits` → từ psychographics
- `buying_motivation`, `decision_factors` → từ buying_behavior
- `preferred_channels`, `social_platforms` → từ digital_behavior
- `response_tone_hints` → từ ai_enhancement.tone_descriptors
- `content_preferences`, `device_usage` → JSONB từ ai_enhancement

### Bước 3: Insert Vietnamese Translations vào `industry_persona_translations_v2`
Mỗi persona một bản dịch tiếng Việt (name_vi, description_vi, motto, tagline).

### Bước 4: Thêm metadata đặc trưng VN
- `country_variants`: `{ "VN": { regions: ["HCM", "Hà Nội", "Đà Nẵng"] } }`
- `journey_stages`: 4 stages chi tiết (awareness/consideration/decision/post_purchase)
- Marketing hooks theo lịch văn hóa VN (Tết, 8/3, 20/10) lưu trong `properties` JSONB

### Bước 5: Verify
Query lại để confirm 5 personas + translations đã insert đúng, sau đó refresh UI Admin Industries.

### Files/Tools sẽ dùng (khi switch sang default mode)
- `supabase--read_query` để check pack hiện có
- Migration tool để insert (vì là data operation lớn, dùng SQL trực tiếp gọn hơn 5 lệnh insert riêng lẻ)
- Không sửa code frontend — UI Admin Industries hiện tại đã hiển thị được personas

### Lưu ý quan trọng
- 5 personas là rất nhiều dữ liệu phong phú → sẽ insert đầy đủ pain_points/goals/objections từ tất cả 4 journey stages, không cắt bớt
- "Do-not-mix rules" sẽ lưu vào `properties.tone_avoid` của mỗi persona để AI generation dùng được
- Marketing hooks theo mùa (Tết, 8/3, kỷ yếu...) lưu vào `properties.seasonal_hooks`
- Sub-variants của Linh (bride/student/KOL) lưu vào `properties.sub_variants`

