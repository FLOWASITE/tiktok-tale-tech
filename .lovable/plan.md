## 🐛 Bug đã xác nhận

**Hiện trạng từ DB (brand Flowa, override `min_length: 1000, max_length: 2000` từ):**
| ID bài | Setting yêu cầu | Thực tế | Thiếu |
|---|---|---|---|
| `05c2f755...` (08:30 hôm nay) | 1000–2000 từ | **660 từ** | -340 |
| `e86e9305...` (05:39) | 1000–2000 từ | **456 từ** | -544 |

→ AI generate ngắn hơn `min_length` ~30-50%.

## 🔍 Root cause

Tại `generate-multichannel/index.ts` **line 4293 và 4571**, hàm `calculateChannelMaxTokens(channel, options)` được gọi mà **KHÔNG truyền `channelMaxLength` + `lengthUnit`** từ override của brand:

```ts
const dynamicTokens = calculateChannelMaxTokens(channel, {
  contentGoal,
  qualityMode,
  // ❌ THIẾU: channelMaxLength, lengthUnit
});
```

Hệ quả:
- Hàm này (xem `_shared/dynamic-tokens.ts` line 105-118) khi không có `channelMaxLength` sẽ rơi xuống branch dùng `config.maxTokens` mặc định × multipliers — không liên quan tới brand setting.
- Với website, `bufferMultiplier=1.3`, multiplier goal/quality ~1.0 → output token cap ~8000, đủ chỗ. Nhưng AI **không biết "phải dùng tối thiểu bao nhiêu token"** → tự ngắn để an toàn.
- Prompt instruction (line 1116-1126) có ghi "BẮT BUỘC tối thiểu 1000 chữ" nhưng vì `min_length=1000 < 200` của fallback condition? Không — 1000 ≥ 200 nên rơi vào branch line 1116-1120 (mạnh nhất). Tức prompt OK rồi.

→ **Vấn đề thực sự**: AI (qwen-plus) không tuân thủ chính xác min_length cho long-form. Cần **3 fix kết hợp**:

## 🔧 Plan fix

### 1. Pass `channelMaxLength` + `lengthUnit` vào `calculateChannelMaxTokens`

Cả 2 chỗ (line 4293 path streaming, line 4571 path agent parallel) — đọc `mergeChannelSettings(channel, channelOverrides)` trước để có `min_length/max_length/length_unit`, rồi truyền vào:

```ts
const channelSettings = mergeChannelSettings(channel, channelOverrides);
const dynamicTokens = calculateChannelMaxTokens(channel, {
  contentGoal,
  qualityMode,
  channelMaxLength: channelSettings.max_length,  // ← MỚI
  lengthUnit: channelSettings.length_unit,        // ← MỚI
});
```

→ Token budget sẽ scale đúng theo brand override (vd Flowa max=2000 từ → ~3900 token + buffer ~5070 token).

### 2. Tăng cường enforcement trong system prompt cho long-form (≥500 từ)

Tại `buildChannelRulesPrompt` (line 1104), thêm branch riêng cho **long-form** (min_length ≥ 500):

```ts
if (settings.min_length && settings.min_length >= 500) {
  parts.push(`- Độ dài: 🚨 **LONG-FORM BẮT BUỘC ${settings.min_length}-${settings.max_length} ${lengthLabel}**`);
  parts.push(`  📊 Phân bổ: Hook 50-80 từ + Thân bài ${Math.round(settings.min_length*0.7)}-${Math.round(settings.max_length*0.75)} từ (chia 4-6 sections H2) + Kết+CTA 50-100 từ`);
  parts.push(`  ✅ KHI VIẾT XONG → ĐẾM TỪ. Nếu < ${settings.min_length} → MỞ RỘNG section yếu nhất bằng case study, số liệu, ví dụ cụ thể`);
  parts.push(`  ❌ DƯỚI ${settings.min_length} ${lengthLabel} = AUTO REJECT, phải retry`);
}
```

### 3. Post-generation length validation + auto-extend (optional, an toàn)

Sau khi nhận content từ AI, nếu `wordCount < min_length × 0.85` (tức thiếu hơn 15%) → trigger 1 lần "extend pass" với prompt `"Bài hiện tại {X} từ, cần thêm {Y} từ. Mở rộng section yếu nhất với ví dụ/case study, KHÔNG đổi cấu trúc/SEO/CTA"`. Tái dùng cùng model + ai-provider.

→ Đảm bảo SLA về độ dài ngay cả khi model "lười".

## 📁 Files thay đổi
- `supabase/functions/generate-multichannel/index.ts` (3 chỗ: ~line 1116, 4293, 4571 + 1 hàm helper extend ~30 dòng)

## ⚠️ Không làm
- ❌ Không backfill bài cũ
- ❌ Không đụng bài lỗi `ec82d405...`
- ❌ Không thay default settings (vẫn 800-2000 cho website)

## ✅ Kỳ vọng sau fix
- Bài website mới của Flowa: **1000-2000 từ** ổn định (test: tạo bài topic bất kỳ → check `website_content` ≥ 1000 từ)
- Bài website của TAF (override 1200-3000): tự động đạt ≥1200 từ
- Channel khác không ảnh hưởng (cùng helper, brand chưa override → dùng default settings như cũ)

## 🧪 Test plan
1. Tạo 1 bài multichannel với brand Flowa, channel `website` only
2. Verify DB: `SELECT length(website_content), array_length(regexp_split_to_array(trim(website_content),'\s+'),1) FROM multi_channel_contents ORDER BY created_at DESC LIMIT 1`
3. Expected: word_count ≥ 1000
