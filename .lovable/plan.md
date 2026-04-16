

## Cập nhật Global Pack "AI & Automation Services" lên v3.0

### Tổng quan
Cập nhật industry pack `ai_automation_services` (ID: `ce0a02aa-676a-41b9-9ad7-1708b1d5ae99`) với dữ liệu nghiên cứu chuyên sâu v3.0. Chỉ cập nhật **Phần 1 (Global Pack)** theo yêu cầu.

### Dữ liệu hiện tại
- **Pack ID**: `ce0a02aa-676a-41b9-9ad7-1708b1d5ae99`
- **Version hiện tại**: `1.0` → sẽ update lên `3.0`
- **Có 3 Jurisdiction Profiles**: VN, SG, US
- **Có 1 Translation**: vi

### Thay đổi
Sử dụng **insert tool** (UPDATE query) để cập nhật 8 cột JSONB/array trong bảng `industry_global_packs`:

1. `version` → `'3.0'`
2. `global_brand_voice` → JSON mới với thêm `tone_must_avoid`, `voice_dos`, `voice_donts`
3. `global_terminology` → JSON mới mở rộng (22 forbidden_terms_global, 29 preferred_terms vi, 30 en, 21 forbidden_words vi, 21 en, thêm `technical_glossary`)
4. `global_compliance_rules` → 15 rules (từ EU AI Act, Vietnam AI Law 2026, GDPR)
5. `global_claim_restrictions` → 13 restrictions chi tiết với examples
6. `global_argument_patterns` → 12 valid + 13 forbidden patterns
7. `global_system_rules` → 15 rules
8. `risk_guidelines` → Mở rộng scoring weights (7 dimensions) + auto_block_conditions
9. `related_industries` → 12 industries (thêm cybersecurity, fintech, edtech...)

**Lưu ý**: Các trường bổ sung không có trong schema (`industry_definition`, `industry_subsectors`) sẽ được bỏ qua vì bảng không có cột tương ứng. Nếu cần lưu, có thể đưa vào metadata hoặc thêm cột sau.

### Không thay đổi
- Không thay đổi schema/cấu trúc bảng
- Không thay đổi Jurisdiction Profiles (Phần 2) và Translations (Phần 3) — chờ user gửi tiếp
- Không thay đổi code frontend

