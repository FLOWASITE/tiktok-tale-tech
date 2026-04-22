

# Fix: Telegram báo "ảnh sẵn sàng" nhưng thực tế ảnh KHÔNG được tạo

## Root cause (đã xác nhận từ logs)

```
[generate-brand-image] GeminiGen timeout 60s
[poyo-generator] Insufficient credits (embedded 402)
[generate-brand-image] PoYo fallback also failed: POYO_CREDITS_EXHAUSTED
→ generate-brand-image trả HTTP 200 + {success: false, errorCode: 'CREDITS_EXHAUSTED'}

[handleGenerateSingle][image] generated for cf9e85e3.../facebook  ← LOG NHẦM
→ User nhận message "🎨 Ảnh đã sẵn sàng" nhưng KHÔNG có ảnh
```

**2 vấn đề tách biệt**:
1. **Bug trong telegram-webhook**: chỉ check `res.ok` (HTTP 200), không parse body để check `data.success`. Vì `generate-brand-image` cố ý trả 200 với `{success: false}` cho mọi lỗi provider, telegram bot nhầm tưởng OK.
2. **Hết credits PoYo + GeminiGen chậm**: cần báo cho user lý do thực sự để biết action tiếp theo (top-up / chờ).

## Fix (1 file, ~25 dòng)

File: `supabase/functions/telegram-webhook/index.ts`, hàm `generateImageForSinglePost` (~1272-1351)

### 1. Parse response body để check `success` thực sự

```ts
let ok = false;
let failReason: string | null = null;
try {
  // ... fetch generate-brand-image
  if (!res.ok) {
    failReason = `HTTP ${res.status}`;
    console.warn(`[image] non-OK ${res.status}: ${errTxt.slice(0, 200)}`);
  } else {
    const data = await res.json().catch(() => ({}));
    if (data?.success === true && data?.imageUrl) {
      ok = true;
      console.log(`[image] generated for ${contentId}/${channel}`);
    } else {
      // Parse errorCode để báo user thân thiện
      const code = data?.errorCode || "UNKNOWN";
      const msg = data?.error || "lỗi không xác định";
      failReason = code === "CREDITS_EXHAUSTED" ? "credits_exhausted"
        : code === "PROVIDER_ERROR" ? "provider_error"
        : "unknown";
      console.warn(`[image] body says fail: code=${code}, msg=${msg.slice(0,150)}`);
    }
  }
} catch (e) {
  failReason = "exception";
  console.warn("[image] failed:", e);
}
```

### 2. Message Telegram đúng theo lý do fail

Block notify (~1334-1346), thay 1 message generic bằng 3 case:

- **`credits_exhausted`**: 
  ```
  ⚠️ Hệ thống tạm hết quota ảnh AI hôm nay
  Bài _"<title>"_ đã có nội dung text, nhưng chưa có ảnh.
  Liên hệ admin để top-up, hoặc dùng "Tạo lại ảnh" trong Mini App sau.
  [🖼 Mở Mini App]
  ```
- **`provider_error`** (timeout, API lỗi):
  ```
  ⏳ Tạo ảnh chậm hơn dự kiến cho bài _"<title>"_
  Bạn có thể bấm "Tạo lại ảnh" trong Mini App để thử lại.
  [🖼 Mở Mini App]
  ```
- **`unknown`** / `HTTP xxx`: giữ message "⚠️ Ảnh chưa tạo được..." như cũ.
- **Success**: giữ "🎨 Ảnh đã sẵn sàng..." như cũ.

### 3. (Optional, an toàn) Tăng timeout fetch generate-brand-image

Hiện tại fetch không có AbortController → có thể treo. Vì là fire-and-forget nên không gấp, nhưng nên thêm `AbortSignal.timeout(120_000)` (120s) để chắc chắn release resource khi `generate-brand-image` đã chạy >90s.

## Note về root cause hệ thống (ngoài phạm vi fix Telegram)

- **PoYo hết credits** → cần admin top-up (không fix trong code được)
- **GeminiGen timeout 60s liên tục với `status=0`** → có thể tài khoản GeminiGen có vấn đề (queue dài, hết credit ngầm). Đề xuất pha sau: thêm log lý do GeminiGen trả status=0 mãi (xem response body khi timeout). Hiện tại chỉ log `status=0` nhưng không log error field nào kèm theo.
- **Confirm credit status**: user nên kiểm tra dashboard PoYo (`api.poyo.ai`) và GeminiGen (`api.geminigen.ai`) để top-up nếu thực sự cạn.

## Files sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/telegram-webhook/index.ts` | Hàm `generateImageForSinglePost`: (a) parse JSON body để check `data.success` + `data.imageUrl` thay vì chỉ `res.ok`; (b) phân loại 3 fail reason để gửi message đúng cho user; (c) thêm AbortSignal.timeout 120s cho fetch. |

## Rủi ro

Rất thấp. Defensive parsing + UX message rõ ràng hơn. User sẽ biết chính xác **tại sao** ảnh không được tạo (hết credits vs timeout) thay vì bị lừa "ảnh sẵn sàng" rồi vào Mini App không thấy gì.

## Ngoài phạm vi

- Top-up credits PoYo / GeminiGen (cần user thao tác trên provider dashboard)
- Tăng timeout GeminiGen từ 60s → 90s (đã có history quyết định 60s vì edge function wall-clock 150s — không nên tăng)
- Thêm "Tạo lại ảnh" command qua Telegram (defer)

