

# Fix: Bot Telegram không phản hồi `/start` (boot fail)

## Nguyên nhân (xác định từ log)

`telegram-webhook` đang **boot fail liên tục**:
```
worker boot error: Uncaught SyntaxError: Identifier 'prompts' has already been declared
at .../telegram-webhook/index.ts:1852:9
```

(Line số trong log lệch vì có comment block — vị trí thật là **line 2236**.)

Trong `handleExamples`, biến `prompts` đã được destructure từ Supabase query ở line 2205:
```ts
const { data: prompts } = await supabase
  .from("telegram_example_prompts")
  .select(...);
```

Sau đó ở line 2236, lần persist DB mới (vừa thêm hôm trước) khai báo lại biến **cùng tên** trong cùng scope:
```ts
const prompts = list.slice(0, 7).map((p) => p.prompt);  // ❌ shadow same scope
```

→ TypeScript/Deno reject ngay khi parse → function không boot được → **mọi update từ Telegram bị drop** → bot im lặng hoàn toàn (kể cả `/start`).

## Giải pháp

Đổi tên biến local thành `promptTexts` để tránh đụng `prompts` (đã chứa raw rows từ DB).

**File:** `supabase/functions/telegram-webhook/index.ts`

```ts
// line 2235-2244 — đổi từ:
const prompts = list.slice(0, 7).map((p) => p.prompt);
try {
  await supabase.from("telegram_example_cache").delete().eq("chat_id", chatId);
  if (prompts.length > 0) {
    await supabase.from("telegram_example_cache").insert(
      prompts.map((prompt, idx) => ({ chat_id: chatId, idx, prompt })),
    );
  }
}

// → thành:
const promptTexts = list.slice(0, 7).map((p) => p.prompt);
try {
  await supabase.from("telegram_example_cache").delete().eq("chat_id", chatId);
  if (promptTexts.length > 0) {
    await supabase.from("telegram_example_cache").insert(
      promptTexts.map((prompt, idx) => ({ chat_id: chatId, idx, prompt })),
    );
  }
}
```

## Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/telegram-webhook/index.ts` | Rename biến local `prompts` → `promptTexts` ở `handleExamples` (3 chỗ trong block try) |

## Test E2E

1. Sau deploy → log `telegram-webhook` không còn `worker boot error`, có `booted (time: …ms)` thành công.
2. Vào Telegram → gõ `/start` → bot phản hồi onboarding/welcome trong < 2s.
3. `/examples` → bot trả 7 prompt + nút "Thử" hoạt động (đã sửa hôm trước).
4. Các flow khác (`/generate`, callback approve, free chat) — không đụng, vẫn chạy.

## Ước tính
**1 phút** — sửa 3 reference biến trong cùng 10 dòng code.

## Rủi ro
Không. Chỉ rename biến local, không đổi logic, không đụng DB/schema.

