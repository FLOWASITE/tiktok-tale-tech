

# Fix `(...||"").trim is not a function` trong telegram-webhook

## Root cause

Stack trace `trace=ca4e4a8e` chỉ vào `handleGenerateSingle`, lỗi `((intermediate value) || "").trim is not a function`. Trong code có nhiều chỗ pattern `(x || "").trim()` — nếu `x` là **object** (vd `brand.brand_name` lưu dạng i18n `{vi, en}`), thì `x || ""` trả về object (truthy) → `.trim()` không tồn tại → crash.

Các điểm rủi ro trong `handleGenerateSingle`:
- Line 1530: `(brand?.brand_name || "").trim()` ← nghi can chính
- Line 1531: `(brand?.industry || "").trim()`
- Line 165, 240, 345: `(message.text || "").trim()` — Telegram message.text luôn string nên an toàn

`suggestTopicFromAI` cũng vừa fail (`The signal has been aborted` — timeout 18s) → rơi vào nhánh fallback ở line 1528-1546 → đụng `brand.brand_name.trim()` → crash.

## Fix (1 file, ~6 dòng)

File: `supabase/functions/telegram-webhook/index.ts`

### 1. Thêm helper `toSafeString` (gần `escapeMd`, line ~720)

```ts
function toSafeString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  // object/array — try i18n fields
  const anyV = v as any;
  return String(anyV.vi || anyV.en || anyV.text || anyV.name || "");
}
```

### 2. Thay `(x || "").trim()` bằng `toSafeString(x).trim()` ở line 1530-1531

```ts
const truncBrand = toSafeString(brand?.brand_name).trim().slice(0, 40);
const industry = toSafeString(brand?.industry).trim();
```

### 3. Audit thêm 2 chỗ rủi ro tương tự trong cùng function

- Line 1611: `channelText.trim()` — đã safe (line 1604-1608 coerce object→string rồi)
- Line 1548: `String(effectiveTopic || "").trim()` — đã safe (đã coerce trước đó)
- Các `appendBrandFooter(... brand?.brand_name ...)` (line 1554, 1657, …): pass object vào → bên trong `appendBrandFooter` có thể crash. **Bọc lại bằng `toSafeString(brand?.brand_name)`** ở mọi callsite trong `handleGenerateSingle`.

### 4. Tăng timeout `suggestTopicFromAI` từ 18s → 25s (giảm fallback)

Hiện tại budget 18s khiến AI hay timeout → rơi vào fallback (chỗ vừa crash). Tăng lên 25s — vẫn an toàn so với edge function wall-clock 60s.

### 5. Log thêm để chắc chắn root cause

Trong block fallback (sau line 1528), log:
```ts
console.log(`[handleGenerateSingle] fallback brand types: name=${typeof brand?.brand_name}, industry=${typeof brand?.industry}, value=${JSON.stringify({n: brand?.brand_name, i: brand?.industry}).slice(0,200)}`);
```

→ Lần chạy tiếp theo confirm có phải `brand_templates.brand_name` đang lưu i18n object không. Nếu đúng → pha sau migrate normalize về string ở DB layer.

## Files sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/telegram-webhook/index.ts` | (a) Thêm `toSafeString` helper; (b) thay `(brand?.brand_name||"").trim()` và `(brand?.industry||"").trim()` ở line 1530-1531; (c) bọc `toSafeString` quanh `brand?.brand_name` trong các `appendBrandFooter` callsites; (d) tăng timeout `suggestTopicFromAI` 18s→25s; (e) thêm debug log trong fallback. |

## Rủi ro

Rất thấp. Defensive coercion + tăng timeout không đổi luồng. User sẽ tạo bài Telegram được ngay sau deploy, kể cả khi `brand_name` là object i18n.

## Ngoài phạm vi

- Migrate schema `brand_templates.brand_name` từ jsonb i18n về plain text (defer — cần audit toàn app)
- Telegram lỗi 18s timeout AI → đã có thông báo "đang viết… 20-40s" cho user (UX OK)

