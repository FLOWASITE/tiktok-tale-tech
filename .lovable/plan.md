## 🎯 Root cause

Bảng `ai_channel_model_configs` (global, `organization_id IS NULL`) đang ép channel `zalo_oa`, `twitter`, `website` dùng model **`qwen3-plus` / `qwen3-max`**. Trong đó **`qwen3-plus` không tồn tại trên DashScope** → mọi request gọi LLM cho 2 channel này trả `404 model_not_found` → `channelResults.zalo_oa = undefined` → cột `zalo_oa_content` lưu `NULL`.

**Bằng chứng từ logs:**
```
[ai-provider] DashScope error: 404 {"message":"The model `qwen3-plus` does not exist..."}
[streaming-mode] Errors: { zalo_oa: "DashScope error: 404" }
```

**Bằng chứng từ DB:** 4/5 row gần nhất có `zalo_oa` trong `selected_channels` đều có `zalo_oa_content = NULL` kể từ 26/04 — đúng thời điểm config bị set sai.

---

## 🛠️ Fix (2 bước)

### Bước 1 — Sửa data (migration)
Update 3 row sai trong `ai_channel_model_configs` (global scope):
- `zalo_oa`: `qwen3-plus` → `qwen-plus` (tên đúng)
- `twitter`: `qwen3-plus` → `qwen-plus`
- `website`: `qwen3-max` → giữ nguyên (model này **có tồn tại**) hoặc downgrade về `qwen-plus` cho an toàn — sẽ verify trước khi quyết định bằng cách thử curl 1 lần qua test.

### Bước 2 — Defensive fix code (`supabase/functions/_shared/ai-provider.ts`)
Khi DashScope trả `404 model_not_found`, **auto-fallback sang `qwen-plus`** thay vì để channel fail im lặng. Hiện tại code chỉ retry khi gặp 402 (hết credit) / 429 (rate limit). Sửa logic retry để bắt thêm pattern `"model_not_found"` / `"does not exist"` → log warning + retry với `qwen-plus`. Cách này phòng trường hợp tương lai admin lại set sai model name.

### Bước 3 — UX guard (`src/pages/admin/AdminChannelModelConfigs.tsx` — nếu có)
Validate dropdown chỉ cho chọn model nằm trong allowlist `ALLOWED_MODELS` (đã có trong `topic-ai/index.ts`). Tránh admin gõ tay sai tên.

---

## ✅ Verification sau khi fix
1. Query: `SELECT channel, model_override FROM ai_channel_model_configs WHERE model_override LIKE 'qwen3-plus';` → phải trả 0 row.
2. Tạo bài multichannel mới có chọn `zalo_oa` + `twitter` → check `zalo_oa_content`/`twitter_content` không còn NULL.
3. Check edge logs `generate-multichannel` không còn `DashScope error: 404`.

---

## ⚠️ Tác động phụ
- **Không có**. Đây chỉ sửa config + thêm safety net retry — không động vào schema, không động vào RLS, không ảnh hưởng các bài đã tạo (chỉ bài mới hưởng lợi). Bài cũ với `zalo_oa_content = NULL` cần regenerate thủ công nếu muốn lấp.
