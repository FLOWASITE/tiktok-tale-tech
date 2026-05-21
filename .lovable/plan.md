## Nguyên nhân ảnh không tạo được

Probe trực tiếp cho thấy:
- ✅ `GEMINIGEN_API_KEY` còn sống, submit task thành công (HTTP 200)
- ❌ Sau **30s** task vẫn `status=0` (queued, chưa render xong)
- ⚠️ Edge function chỉ cho phép **45s** poll (`geminigenAttempts: 15 × 3s`) → timeout
- ⚠️ Khi timeout, code KHÔNG fallback sang PoYo (dù `POYO_API_KEY` có sẵn) mà fallback sang Lovable AI Gateway `gemini-3-pro-image-preview` — fallback này cũng fail → trả về `CREDITS_EXHAUSTED` cho client

→ Pipeline fail tại 60-63s = 45s GeminiGen timeout + ~15s Lovable AI fail.

```text
GeminiGen submit (✅) ─▶ Poll 45s ─▶ ❌ TIMEOUT
                                      │
                                      ▼
                              Lovable AI Gateway (❌ fail)
                                      │
                                      ▼
                          CREDITS_EXHAUSTED  ← nhãn sai
```

PoYo có sẵn key + có model tương đương (`poyo/nano-banana-2-new`, `poyo/nano-banana-pro`) nhưng không nằm trong fallback chain.

## Plan sửa

### 1. Nâng poll budget GeminiGen
`generate-brand-image/index.ts` dòng 237-239:
- `geminigenAttempts: 15 → 40` (40 × 3s = 120s, vẫn dưới 150s idle timeout)
- Đủ room cho `nano-banana-2` (~80-90s thực tế)

### 2. Thêm PoYo vào fallback chain của GeminiGen
`generate-brand-image/index.ts` dòng 1017-1046, đổi thứ tự fallback:

```text
GeminiGen ─▶ ❌ ─▶ PoYo (nano-banana-2-new, sau đó nano-banana-pro) ─▶ ❌ ─▶ Lovable AI ─▶ ❌ ─▶ Báo lỗi
```

- Map `geminigen/nano-banana-2` → `poyo/nano-banana-2-new`
- Map `geminigen/nano-banana-pro` → `poyo/nano-banana-pro`
- Map `geminigen/imagen-4` → `poyo/nano-banana-pro` (gần nhất)
- Skip PoYo nếu `POYO_API_KEY` không có hoặc PoYo cũng credits-exhausted
- Cập nhật `providerDebug.fallbackProvider = 'poyo'` để FE hiển thị đúng

### 3. Sửa nhãn lỗi misleading
Khi GeminiGen timeout (không phải credits): trả `errorCode: 'PROVIDER_TIMEOUT'` với message "GeminiGen render quá chậm, đã thử PoYo + Lovable AI nhưng đều fail". Chỉ giữ `CREDITS_EXHAUSTED` khi thật sự có `AUTH_ERROR|402|429|insufficient_credits` từ tất cả provider.

### 4. (Tùy chọn) Bổ sung tương tự cho nhánh KIE
KIE branch (dòng 1077-1107) đã có fallback PoYo rồi, nhưng chỉ thử `poyo/nano-banana-pro`. Nếu PoYo pro fail, có thể thử `nano-banana-2-new` trước khi bỏ cuộc.

### 5. Verify
- Deploy lại `generate-brand-image`
- Bạn bấm Tạo ảnh trên `/multichannel`
- Edge logs kỳ vọng: nếu GeminiGen chậm/fail → `[generate-brand-image] GeminiGen failed/timeout, falling back to PoYo (poyo/nano-banana-2-new)...` → ảnh trả về trong ~30-60s

## Không đụng vào
- `_shared/circuit-breaker.ts`, `MODEL_TO_PROVIDER`, RLS, schema DB
- Admin AI config (giữ `geminigen/nano-banana-2` làm primary)
- Nhánh PoYo/KIE/9Router/Lovable primary
- UI/prompt builder

Approve để mình triển khai theo thứ tự 1 → 2 → 3 → 4 → 5.
