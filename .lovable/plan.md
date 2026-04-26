## 🎯 Mục tiêu
UPSERT 3 bản dịch (vi/en/th) vào `industry_pack_translations` cho pack `marketing_advertising` (id `8eabae8b-b777-4bc9-a84c-24fd2a68c56d`), khớp Global Pack v3.0 vừa seed.

## 📊 Verify hiện trạng
- Bảng có 10 cột: `id, global_pack_id, language_code, name, short_name, preferred_terms (text[]), forbidden_terms (text[]), glossary (jsonb), created_at, updated_at`
- Hiện chỉ có 1 row `vi` cũ với `preferred_terms` & `forbidden_terms` NULL → sẽ overwrite

## 🗺️ Mapping JSON → Schema

| Field JSON | Cột DB | Ghi chú |
|---|---|---|
| `language_code` | `language_code` | vi / en / th |
| `name` | `name` | NOT NULL |
| `short_name` | `short_name` | th không có → derive `การตลาด` |
| `preferred_terms` | `preferred_terms` (text[]) | array literal |
| `forbidden_terms` | `forbidden_terms` (text[]) | array literal |
| `category_description` | `glossary->>'category_description'` | **nhúng JSONB — schema không có cột riêng** |
| `industry_keywords_seo` | `glossary->'industry_keywords_seo'` | **nhúng JSONB** |

## 📝 Các bước

### Bước 1 — UPSERT 3 rows (insert tool)
1 SQL `INSERT … ON CONFLICT (global_pack_id, language_code) DO UPDATE`:
- **vi**: 36 preferred_terms, 26 forbidden_terms, glossary = `{category_description, industry_keywords_seo: [13 keywords]}`
- **en**: 32 preferred_terms, 17 forbidden_terms, glossary = `{category_description, industry_keywords_seo: [11 keywords]}`
- **th**: 11 preferred_terms, 8 forbidden_terms, glossary = `{}` (input không có 2 trường này)

ON CONFLICT refresh: name, short_name, preferred_terms, forbidden_terms, glossary, updated_at.

### Bước 2 — Verify
```sql
SELECT language_code, name, short_name,
       array_length(preferred_terms,1) AS pref_count,
       array_length(forbidden_terms,1) AS forb_count,
       glossary ? 'category_description' AS has_desc,
       glossary ? 'industry_keywords_seo' AS has_seo
FROM industry_pack_translations
WHERE global_pack_id = '8eabae8b-b777-4bc9-a84c-24fd2a68c56d'
ORDER BY language_code;
```
Expect: en (32/17/true/true), th (11/8/false/false), vi (36/26/true/true).

## ⚠️ Lưu ý
- **Không tạo migration** — data update, dùng insert tool theo rule `<updating-tables>`
- **Không có trigger** invalidate AI cache trên bảng này — translations chỉ phục vụ UI/SEO, không tham gia compliance hash
- **Quy ước nhúng `category_description` + `industry_keywords_seo` vào `glossary` JSONB** vì schema không có cột riêng. Nếu cần expose như cột text/text[] riêng cho edge function, sẽ cần migration thêm cột sau — flag trước để tránh hiểu ngầm
- Row `vi` hiện tại glossary NULL → không xung đột

## ✅ Kết quả mong đợi
- 3 rows translations active cho pack v3.0
- Sẵn sàng cho UI brand picker đa locale + SEO landing pages
- Edge functions đọc qua `industry_pack_translations` thấy đủ vi/en/th