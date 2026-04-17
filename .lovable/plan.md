

User cung cấp Global Pack v3.0 cho ngành **Medical Aesthetic Clinic & Cosmetic Surgery**. Cần update vào DB.

## Kế hoạch: Cập nhật Global Pack "Medical Aesthetic Clinic" v3.0

### Bối cảnh
Trước đây đã import 5 personas vào pack `cosmetic_procedures` (id `08d337d4-96cc-48da-8351-ff569c821f93`). Cần xác định: dùng pack hiện có hay tạo pack mới `medical_aesthetic_clinic`?

→ **Quyết định**: Update pack hiện có `cosmetic_procedures` với data v3.0 (đổi `industry_code` thành `medical_aesthetic_clinic` hoặc giữ và update các field). Lý do: 5 personas đã link vào pack này; tạo pack mới sẽ phải migrate personas.

### Bước thực hiện

**Bước 1: Verify pack hiện tại**
- Query `industry_global_packs` xem schema và data hiện có của pack `08d337d4-...`
- Confirm các JSONB field: `global_brand_voice`, `global_terminology`, `global_compliance_rules`, `global_claim_restrictions`, `global_argument_patterns`, `global_system_rules`, `risk_guidelines`, `related_industries`

**Bước 2: UPDATE pack `08d337d4-96cc-48da-8351-ff569c821f93`**
Map data v3.0 vào schema DB:

| Field DB | Source v3.0 |
|---|---|
| `industry_code` | `medical_aesthetic_clinic` |
| `target_audience` | `B2C` |
| `version` | `3.0` |
| `global_brand_voice` | tone + formality + language_style + tone_must_avoid + cta_policy + emoji + voice_dos/donts |
| `global_terminology` | forbidden_terms_global + preferred_terms (vi/en) + forbidden_words_by_lang + glossary |
| `global_compliance_rules` | 15 rules array |
| `global_claim_restrictions` | 13 restrictions array |
| `global_argument_patterns` | valid_patterns + forbidden_patterns |
| `global_system_rules` | 15 system rules |
| `risk_guidelines` | high_risk_keywords + scoring_weights + risk_thresholds + auto_block_conditions |
| `related_industries` | 8 industries |

Các field "extra" không có cột riêng (`industry_definition`, `industry_subsectors`, `medical_terminology_glossary`, `tone_must_avoid`, `voice_dos`, `voice_donts`, `auto_block_conditions`) → lưu vào sub-keys của JSONB tương ứng (ví dụ glossary vào `global_terminology.medical_terminology_glossary`, definition + subsectors vào `properties` hoặc append vào `global_brand_voice`).

**Bước 3: Update Vietnamese translation**
- Update `industry_pack_translations` (vi): `name = "Thẩm mỹ Y khoa & Phẫu thuật Thẩm mỹ"`, short_name + glossary từ `medical_terminology_glossary.vi`

**Bước 4: Verify**
- SELECT pack sau update để confirm tất cả field đã apply đúng
- Confirm 5 personas vẫn link đúng vào pack này

### Tools dùng (default mode)
- `supabase--read_query` để verify
- `lov-add-data` để UPDATE (data operation, không phải schema change)

### Không thay đổi
- Không sửa code frontend
- Không tạo pack mới (tránh duplicate + giữ link với 5 personas)
- Không động vào schema DB

### Lưu ý
- Field `industry_definition` (text dài) sẽ lưu vào `properties.industry_definition` hoặc một sub-key của `global_brand_voice` nếu pack không có cột `properties`
- `industry_subsectors` lưu tương tự
- `auto_block_conditions` lưu trong `risk_guidelines.auto_block_conditions` (đúng nested)

