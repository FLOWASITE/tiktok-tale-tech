## 🎯 Mục tiêu
Cập nhật Industry Global Pack `marketing_advertising` từ v1.0 → **v3.0 (Deep Research Edition)** và tạo `industry_jurisdiction_profiles` cho **VN** với resolved_rules sẵn sàng cho compliance-precheck/generate-* edge functions.

## 📊 Trạng thái hiện tại (đã verify)
- DB đã có pack `marketing_advertising` (id `8eabae8b-b777-4bc9-a84c-24fd2a68c56d`, v1.0, active)
- Schema `industry_global_packs` khớp 100% với data v3.0 (đủ cột: `global_brand_voice`, `global_terminology`, `global_compliance_rules`, `global_claim_restrictions`, `global_argument_patterns`, `global_system_rules`, `risk_guidelines`, `related_industries`, `version`)
- Các trường mở rộng trong JSON v3.0 (`industry_definition`, `tone_must_avoid`, `voice_dos/donts`, `technical_glossary`, `auto_block_conditions`, `industry_subsectors`) **không có cột riêng** → sẽ nhúng vào các JSONB phù hợp (xem mapping bên dưới)

## 🗺️ Mapping JSON v3.0 → Schema DB

| Field trong v3.0 | Cột DB đích | Ghi chú |
|---|---|---|
| `target_audience` | `target_audience` | "B2B" |
| `version` | `version` | "3.0" |
| `industry_definition` | gộp vào `global_brand_voice.industry_definition` | giữ trong JSONB |
| `global_brand_voice` (toàn bộ + voice_dos/donts/tone_must_avoid) | `global_brand_voice` | merge full |
| `global_terminology` (preferred_terms, forbidden_*, technical_glossary) | `global_terminology` | merge full, technical_glossary lưu nested |
| `global_compliance_rules` | `global_compliance_rules` | array of objects |
| `global_claim_restrictions` | `global_claim_restrictions` | array of objects |
| `global_argument_patterns` | `global_argument_patterns` | object |
| `global_system_rules` | `global_system_rules` | array |
| `risk_guidelines` (+ `auto_block_conditions`) | `risk_guidelines` | nhúng auto_block_conditions vào cùng object |
| `related_industries` | `related_industries` | text[] |
| `industry_subsectors` | nhúng vào `global_brand_voice.industry_subsectors` | giữ trong JSONB |

## 📝 Các bước thực hiện

### Bước 1 — UPDATE Global Pack v1.0 → v3.0 (insert tool)
Chạy `UPDATE industry_global_packs SET ... WHERE id = '8eabae8b-...'` thay tất cả cột JSONB + `target_audience='B2B'` + `version='3.0'`.
- Trigger `auto_bump_industry_version_on_rules_change` sẽ detect rule changes nhưng vì version cũng thay đổi (1.0→3.0) nên giữ nguyên 3.0
- Trigger `invalidate_cache_on_industry_update` sẽ tự xóa cache cũ
- Trigger `notify_industry_upgrade` sẽ tạo notifications cho mọi user dùng pack này

### Bước 2 — UPSERT Jurisdiction Profile VN (insert tool)
Insert vào `industry_jurisdiction_profiles`:
- `global_pack_id` = id pack
- `jurisdiction_code` = `'VN'`
- `resolved_rules` = clone toàn bộ rules từ Global Pack + thêm:
  - `industry_code: 'marketing_advertising'`
  - `jurisdiction_code: 'VN'`
  - `names: { vi: 'Marketing & Quảng cáo', en: 'Marketing & Advertising' }`
  - `key_regulations`: trích từ `global_compliance_rules` các rule có `source` chứa "Vietnam" (Vietnam Ad Law 2025, NĐ 13/2023, Vietnam AI Law 2026, Luật Trẻ em)
  - `industry_trends`: extract từ industry_definition (AI Marketing Agent, social commerce, creator economy, GEO, search everywhere)
- `validity_status` = `'current'`
- `last_verified_date` = today
- `disclaimer` = "Nội dung tham khảo theo quy định hiện hành tại Việt Nam (Luật Quảng cáo 2025, NĐ 13/2023 về bảo vệ dữ liệu cá nhân). Cam kết kết quả marketing chỉ mang tính tham khảo, không đảm bảo."

ON CONFLICT `(global_pack_id, jurisdiction_code)` → UPDATE `resolved_rules`, `validity_status`, `last_verified_date`, `disclaimer`, `updated_at = now()`.

### Bước 3 — Verify
- `SELECT version, jsonb_array_length(global_compliance_rules), jsonb_array_length(global_claim_restrictions) FROM industry_global_packs WHERE industry_code='marketing_advertising'` → expect v3.0, 13 compliance rules, 12 claim restrictions
- `SELECT jurisdiction_code, validity_status FROM industry_jurisdiction_profiles WHERE global_pack_id='8eabae8b-...'` → expect VN/current

## ⚠️ Lưu ý
- **Không** đụng `industry_pack_translations` (v3.0 không cung cấp dịch tách rời, glossary đã nhúng trong `global_terminology.technical_glossary`)
- **Không** tạo migration mới (đây là data update, dùng insert tool theo rule `<updating-tables>`)
- Auto trigger `notify_industry_upgrade` sẽ ping mọi user/org có brand template gắn industry này — **đây là behavior mong muốn** để user biết Industry Memory upgraded
- Cache AI sẽ tự invalidate qua trigger → lần generate tiếp theo dùng rules v3.0

## ✅ Kết quả mong đợi
- Pack `marketing_advertising` v3.0 active với đầy đủ 13 compliance rules + 12 claim restrictions + risk scoring weights mới
- Jurisdiction Profile VN sẵn sàng cho `compliance-precheck-v2.ts` và mọi edge function `generate-*` đọc qua `industry_jurisdiction_profiles.resolved_rules`
- Notifications tự động gửi đến user dùng industry này
