

# Fix lỗi `(s || "").replace is not a function` trong Telegram bot

## Lỗi chính xác

```
TypeError: (s || "").replace is not a function
  at escapeMd (telegram-webhook/index.ts:716)
  at handleGenerateSingle
```

**Nguyên nhân**: `escapeMd(s)` giả định `s` là string, nhưng có lúc nhận object/array/number (từ AI suggestion trả jsonb `{vi, en}`, hoặc `data[channelKey]` là object thay vì string). `(s || "")` chỉ chặn `null/undefined/0/""` — KHÔNG chặn object truthy → `.replace` không tồn tại trên object → crash.

## Fix (1 file, ~15 dòng)

File: `supabase/functions/telegram-webhook/index.ts`

### 1. `escapeMd` (line 716) — coerce mọi input về string an toàn

```ts
function escapeMd(s: unknown): string {
  if (s == null) return "";
  let str: string;
  if (typeof s === "string") str = s;
  else if (typeof s === "number" || typeof s === "boolean") str = String(s);
  else {
    // object/array — thử lấy field i18n vi/en, không thì JSON
    try {
      const anyS = s as any;
      str = anyS.vi || anyS.en || anyS.text || JSON.stringify(s);
    } catch { str = ""; }
  }
  return str.replace(/([_*\[\]`])/g, "\\$1");
}
```

### 2. `suggestTopicFromAI` (line ~1393) — defensive khi `topic` là object

```ts
const rawTopic = first?.topic ?? first?.title ?? "";
const topic = (typeof rawTopic === "string"
  ? rawTopic
  : (rawTopic?.vi || rawTopic?.en || "")).toString().trim();
```

Đảm bảo nếu `topic-ai` trả i18n object thì lấy `vi` (default locale Flowa) trước khi `.slice`.

### 3. `handleGenerateSingle` — coerce `effectiveTopic` & `channelText` về string trước khi dùng

- Sau block tạo `effectiveTopic` (line ~1514), thêm: `effectiveTopic = String(effectiveTopic || "").trim() || "Bài viết mới";`
- Line 1569: `const channelText = typeof data?.[channelKey] === "string" ? data[channelKey] : "";` (thay cho `(data?.[channelKey] || "") as string`)

### 4. Thêm log debug 1 lần để xác nhận root cause

Trong `suggestTopicFromAI` ngay sau `const first = suggestions[0]`, log:
```ts
console.log(`[suggestTopicFromAI] first.topic type=${typeof first?.topic}, value=${JSON.stringify(first?.topic)?.slice(0,200)}`);
```

→ Lần chạy tiếp theo sẽ confirm có phải topic-ai trả object không, và biết để fix root cause ở `topic-ai` edge function nếu cần.

## Files sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/telegram-webhook/index.ts` | (a) `escapeMd` accept `unknown` + coerce object→string; (b) `suggestTopicFromAI` lấy `.vi/.en` nếu topic là object; (c) `handleGenerateSingle` coerce `effectiveTopic` & `channelText`; (d) thêm 1 dòng log debug |

## Rủi ro

Rất thấp. Defensive coding, không đổi luồng chính. User sẽ có thể tạo bài Telegram lại ngay sau fix.

