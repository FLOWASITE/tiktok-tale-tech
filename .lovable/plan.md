## 🎯 Mục tiêu
UPDATE row `industry_jurisdiction_profiles` (id `a3913611-ef9c-404d-a0b9-af3ce0584a23`, pack `8eabae8b...`, jurisdiction `VN`) — overwrite `resolved_rules` + `disclaimer` bằng **Phần 2 Deep Research Edition** (April 2026).

## 📊 So sánh hiện trạng vs payload mới

| Field trong `resolved_rules` | Hiện tại | Sau update |
|---|---|---|
| `compliance_rules` | ~13 rules generic | **25 rules** với `effective_date`, `source`, `penalty`, `key_changes` |
| `key_regulations` | có | **11 regulations** với `key_articles`, `source_url`, `precedents` (Falm Asia 38tr, Hà Tĩnh 105tr) |
| `industry_trends` | có | **20 trends_2026** (AI Agent, GEO, Cookieless, MMM, Social Commerce 70%, KOL compliance...) |
| `claim_restrictions` | có | **12 claims** với `examples_correct` |
| `terminology` | có | + `vietnamese_marketing_concepts` |
| `brand_voice` | có | + `cultural_notes` (9 điểm văn hóa B2B VN) |
| `market_size_2026` | ❌ | ✅ MỚI (85.6tr internet users, 13.8B USD e-commerce) |
| `vietnamese_marketing_ecosystem` | ❌ | ✅ MỚI (tier-1 agencies, local leaders, MarTech, KOL platforms, associations) |
| `common_use_cases_vn` | ❌ | ✅ MỚI (10 use cases với compliance_notes) |

Payload size: 15.6KB → ~50KB (ước tính)

## 🛠 Bước thực hiện (dùng insert tool — KHÔNG migration)

### Bước 1 — Sanitize JSON từ user input
1. Sửa 2 chỗ thiếu `}` (sau rule `cross_border_advertising` và `data_privacy`)
2. Bỏ entry `common_use_cases_vn` cuối bị truncate (`{` rỗng)
3. Tách `disclaimer` dài (cuối JSON) ra làm cột `disclaimer` cấp profile

### Bước 2 — UPDATE
```sql
UPDATE industry_jurisdiction_profiles
SET resolved_rules = $1::jsonb,        -- payload Phần 2 đầy đủ
    disclaimer     = $2,                -- bản dài cuối JSON
    last_verified_date = '2026-04-17',  -- theo last_updated trong payload
    validity_status = 'current',
    updated_at = now()
WHERE id = 'a3913611-ef9c-404d-a0b9-af3ce0584a23';
```

### Bước 3 — Verify
```sql
SELECT 
  jsonb_array_length(resolved_rules->'compliance_rules')   AS compliance_count,   -- expect 25
  jsonb_array_length(resolved_rules->'key_regulations')    AS regulations_count,  -- expect 11
  jsonb_array_length(resolved_rules->'industry_trends_2026') AS trends_count,     -- expect 20
  jsonb_array_length(resolved_rules->'claim_restrictions') AS claims_count,       -- expect 12
  jsonb_array_length(resolved_rules->'common_use_cases_vn') AS use_cases_count,   -- expect 10
  resolved_rules ? 'market_size_2026' AS has_market_size,
  resolved_rules ? 'vietnamese_marketing_ecosystem' AS has_ecosystem,
  LENGTH(disclaimer) AS disclaimer_len,                    -- expect ~700+
  LENGTH(resolved_rules::text) AS payload_size
FROM industry_jurisdiction_profiles
WHERE id = 'a3913611-ef9c-404d-a0b9-af3ce0584a23';
```

## ⚠️ Side effects (được hệ thống tự xử lý)
- **`auto_bump_industry_version_on_rules_change`** trigger trên `industry_global_packs` — KHÔNG fire vì ta chỉ update `industry_jurisdiction_profiles` (pack v3.0 giữ nguyên).
- **AI cache invalidation**: Cache key dùng `complianceHash` (xem mem `compliance-hash-defense-vn`) — vì `resolved_rules` thay đổi đáng kể, hash sẽ khác → cache cũ tự miss/regenerate ở lần gọi tiếp theo. Không cần manual purge.
- **`notify_industry_upgrade`** trigger chỉ fire trên `industry_template_translations` (legacy) — không ảnh hưởng.

## ❓ Confirm trước khi approve
1. **Field `industry_trends`** hiện tại có sẽ bị **đè bằng `industry_trends_2026`** (key name khác). Edge functions / UI nếu đọc key cũ `industry_trends` cần biết. Bạn có muốn tôi giữ cả 2 key (alias) hay chỉ dùng `industry_trends_2026` theo đúng JSON Phần 2?
2. **Bản `disclaimer` dài cuối JSON** (đặt ngoài `resolved_rules`) → tôi đề xuất ghi vào **cột `disclaimer`** của bảng (700+ ký tự, đè bản 250 ký tự hiện tại). OK không?

Nếu OK với cả 2 → approve plan này, tôi sẽ thực thi UPDATE.