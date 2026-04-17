

User cung cấp Jurisdiction Profile **VN** v3.0 cho ngành `medical_aesthetic_clinic`. Cần upsert vào DB.

## Kế hoạch: Cập nhật Jurisdiction Profile VN cho Medical Aesthetic Clinic

### Bối cảnh
- Global Pack: `08d337d4-96cc-48da-8351-ff569c821f93` (industry_code = `medical_aesthetic_clinic`)
- Bảng đích: `industry_jurisdiction_profiles` (1 row per `global_pack_id` + `jurisdiction_code`)

### Bước 1: Verify pack & profile hiện tại
Query `industry_jurisdiction_profiles` với `global_pack_id = '08d337d4-...'` AND `jurisdiction_code = 'VN'` — confirm có row sẵn để UPDATE hay cần INSERT mới.

### Bước 2: UPSERT profile VN
Map data v3.0 vào schema:

| Field DB | Source |
|---|---|
| `global_pack_id` | `08d337d4-96cc-48da-8351-ff569c821f93` |
| `jurisdiction_code` | `VN` |
| `validity_status` | `current` |
| `last_verified_date` | `2026-04-17` |
| `disclaimer` | text disclaimer |
| `resolved_rules` (JSONB) | toàn bộ object `resolved_rules` |

Trong `resolved_rules` JSONB sẽ chứa đầy đủ:
- `names`, `target_audience`, `market_size_2026`
- `brand_voice` (gồm `cultural_notes` đặc trưng VN)
- `terminology` (forbidden + preferred + `vietnamese_aesthetic_concepts`)
- 22 `compliance_rules` (cite Luật KCB 2023, NĐ 96/2023, NĐ 38/2021, NĐ 13/2023…)
- 13 `claim_restrictions` (kèm precedent Falm Asia, Paris, Thailand Hospital)
- `argument_patterns`, `system_rules`
- 10 `key_regulations` với `key_articles` & `source_url`
- 15 `industry_trends_2026`
- 10 `common_use_cases_vn`
- 12 `common_pain_points_vn`
- `messaging_themes`
- 6 `major_incidents_case_studies` (Thailand Hospital, Paris, TIH, Falm Asia, Hường, Hà Tĩnh)
- `risk_guidelines` với `auto_block_conditions` mở rộng (12 conditions)
- `related_industries`

### Bước 3: Verify
Query lại profile sau upsert — confirm:
- 22 compliance rules đã insert
- 13 claim restrictions
- 10 key regulations với articles
- 6 case studies
- `auto_block_conditions` đầy đủ 12 mục

### Tools (default mode)
- `supabase--read_query` để check & verify
- `lov-add-data` để UPSERT (data operation, không phải schema)

### Không thay đổi
- Không sửa code frontend
- Không động schema
- Không tạo pack mới
- 5 personas + Global Pack v3.0 đã import trước đó vẫn nguyên

### Lưu ý
- Nếu đã có row VN cũ → UPDATE (overwrite `resolved_rules` toàn bộ + cập nhật `last_verified_date`)
- Nếu chưa có → INSERT mới
- JSONB `resolved_rules` lưu nguyên cấu trúc v3.0, không phẳng hóa — để frontend/AI agent đọc trực tiếp các sub-key đặc trưng VN (cultural_notes, case_studies, key_regulations với articles…)

