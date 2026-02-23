

# Giam Cache TTL cua ai-config tu 5 phut xuong 1 phut

## Thay doi

Sua 1 dong duy nhat trong file `supabase/functions/_shared/ai-config.ts`:

- Dong 141: Doi `CACHE_TTL_MS` tu `300000` (5 phut) xuong `60000` (1 phut)
- Khi admin doi model trong Admin Panel, thay doi se co hieu luc trong vong toi da 1 phut thay vi 5 phut

## Anh huong

- Tang so luong query toi database (tu 1 lan/5 phut len 1 lan/1 phut cho moi function)
- Anh huong khong dang ke vi chi la query nho (select 1 row) va chi chay khi function duoc goi

## File thay doi

| File | Dong | Mo ta |
|------|------|-------|
| supabase/functions/_shared/ai-config.ts | 141 | CACHE_TTL_MS: 300000 -> 60000 |

