

# Fix: Nút "Thử" trong /examples báo "đã hết hạn"

## Nguyên nhân

`exampleCache` (line 2229) là **`Map` in-process**. Edge function chạy serverless → mỗi invocation có thể vào worker khác, hoặc worker bị recycle sau vài chục giây idle. Khi user đọc `/examples` xong, ~1 phút sau bấm "Thử" → worker mới → cache rỗng → fallback "Ví dụ này đã hết hạn".

Vấn đề tương tự sẽ xảy ra với **Quick Launchpad** (`ux:welcome:generate`) vì cũng dùng `exampleCache.set` + callback `ux:ex:<idx>` (line 2368).

## Giải pháp

**Tách 2 luồng theo bản chất prompt:**

### 1. Launchpad (`ux:welcome:generate`) — prompts STATIC
4 starter prompts là hardcoded → không cần cache. Đổi callback prefix sang `ux:starter:<idx>`, handler decode trực tiếp từ array hằng số ở module scope.

### 2. `/examples` — prompts ĐỘNG (từ DB + fallback)
Persist vào DB thay vì in-memory. Tạo bảng `telegram_example_cache`:

```sql
CREATE TABLE telegram_example_cache (
  chat_id BIGINT NOT NULL,
  idx SMALLINT NOT NULL,
  prompt TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
  PRIMARY KEY (chat_id, idx)
);
ALTER TABLE telegram_example_cache ENABLE ROW LEVEL SECURITY;
-- service-role only; không cần user policy
CREATE INDEX idx_telegram_example_cache_expires ON telegram_example_cache(expires_at);
```

Thêm cron cleanup mỗi giờ (xóa row hết hạn) — hoặc đơn giản: filter `expires_at > now()` khi đọc + cleanup khi insert mới cho chat đó.

### 3. Sửa code

**File:** `supabase/functions/telegram-webhook/index.ts`

- Khai báo `STARTER_PROMPTS` ở module scope (sau line 2229).
- `case "generate":` (line 2349-2393): bỏ `exampleCache.set`, đổi keyboard sang `ux:starter:${idx}`.
- `handleExamples` (line ~2220): thay `exampleCache.set(chatId, ...)` bằng upsert vào `telegram_example_cache` (delete-then-insert cho chat đó để reset TTL).
- Callback router (line 2441-2452): thêm nhánh mới
  ```ts
  if (group === "starter") {
    const idx = parseInt(key, 10);
    const prompt = STARTER_PROMPTS[idx]?.prompt;
    if (!prompt) return;
    await sendMessage(...); 
    await handleGenerate({ ..., prompt });
    return;
  }
  ```
- Sửa nhánh `if (group === "ex")` thành **async DB lookup** thay vì đọc Map:
  ```ts
  const { data } = await supabase
    .from("telegram_example_cache")
    .select("prompt")
    .eq("chat_id", chatId).eq("idx", idx)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (data?.prompt) { /* run */ } else { /* "đã hết hạn" message */ }
  ```
- Xóa `const exampleCache = new Map(...)` (không dùng nữa).

## Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/migrations/<ts>_telegram_example_cache.sql` | Tạo bảng + index + RLS |
| `supabase/functions/telegram-webhook/index.ts` | Tách `STARTER_PROMPTS`, đổi launchpad sang `ux:starter:`, persist `/examples` qua DB, xóa Map |

## Test E2E

1. `/start` → bấm "🚀 Tạo campaign đầu" → bấm 1 starter → chạy ngay (không phụ thuộc cache, luôn OK kể cả sau 1 ngày)
2. `/examples` → đợi 2 phút → bấm "Thử" → vẫn chạy (DB còn TTL 1h)
3. `/examples` lần 2 → list mới ghi đè list cũ cho chat đó → bấm "Thử" idx 0 → chạy prompt mới
4. Sau 1h không hoạt động → bấm "Thử" trên message cũ → vẫn báo "đã hết hạn" (graceful)

## Ước tính
**8 phút** — 1 migration nhỏ + sửa 1 file ~40 dòng.

## Rủi ro
Thấp. Bảng mới riêng biệt, không động schema hiện hữu. Service-role only nên không cần policy phức tạp. In-memory Map bị xóa nhưng đã thay bằng DB tin cậy hơn.

