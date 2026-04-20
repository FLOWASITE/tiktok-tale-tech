

# Fix: Bot không hiểu "Tạo chiến dịch tháng 5"

## 🎯 Root cause

Thực tế **bot HIỂU đúng** — logs show `intent: generate_campaign` → `handleGenerate` chạy → goal `4d85693a-...` "Tạo mới chiến dịch cho tháng 5" đã được insert vào DB lúc 15:59:05.

**Vấn đề nằm ở 2 điểm sau khi tạo goal:**

1. **Pipeline không được tạo**: `triggerPipeline` gọi `agent-pipeline` với `action=trigger_from_goal` → function này gọi `generate-campaign-strategy` → function đó đang **hết credits Lovable Gateway (402)** và fallback sang DashScope cũng đang fail (xem logs `generate-campaign-strategy` có nhiều `payment_required` 402). Kết quả: 0 pipeline được tạo, goal mồ côi.

2. **User không nhận feedback đúng**: Goal được tạo với `target_topics=[]`, `target_channels=[]`, `frequency={}` (rỗng) → `generate-campaign-strategy` thiếu input → fail sớm. Message "✅ Pipeline đã khởi chạy" vẫn được gửi (vì `triggerPipeline` là fire-and-forget `.catch`), nên **user thấy "Pipeline đã khởi chạy" nhưng thực tế không có gì chạy** → bối rối "bot ko hiểu để làm".

## 🔧 Fix

### 1. `handleGenerate` — await & report lỗi thật

Thay fire-and-forget bằng await có timeout ngắn, bắt lỗi và báo cụ thể:

```ts
// Thay vì triggerPipeline(...).catch(...)
try {
  const r = await Promise.race([
    triggerPipeline(goal.id, botConfig.organizationId),
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000))
  ]);
  // r có { success, plan_id, pipelines_created }
  if (!r?.pipelines_created) {
    await sendMessage(botConfig.botToken, chatId, 
      "⚠️ Goal đã tạo nhưng chưa tạo được plan (AI gateway tạm quá tải). Bạn mở Mini App để chạy lại hoặc thử sau ít phút.");
    return;
  }
  await sendMessage(..., `✅ Đã tạo ${r.pipelines_created} pipeline từ goal "${goal.name}".\nDùng /status để theo dõi.`);
} catch (e) {
  // Goal vẫn tồn tại, báo user biết để retry
  await sendMessage(..., `⚠️ Goal "${goal.name}" đã lưu nhưng chưa khởi chạy được (${String(e).slice(0,80)}). Thử lại sau bằng /status hoặc Mini App.`);
}
```

→ `triggerPipeline` cần return JSON thay vì void.

### 2. `handleGenerate` — điền defaults vào goal

Goal đang insert với `target_topics=[]`, `target_channels=[]`, `campaign_duration_days` không có. Thêm defaults hợp lý để `generate-campaign-strategy` luôn có input:

```ts
.insert({
  name: prompt.slice(0, 120),
  description: prompt,
  // ...
  target_channels: ["facebook", "website"],      // default 2 kênh
  campaign_duration_days: 14,
  campaign_start_date: new Date().toISOString().split("T")[0],
  brand_template_id: brandCtx?.id || null,       // ← dùng active brand
})
```

### 3. Surface lỗi AI gateway trong reply

Trong `handleGenerate` catch case, detect 402/credits → message thân thiện:
> "🤖 AI đang hết credits. Admin có thể nạp thêm trong Lovable Cloud, hoặc cấu hình API key riêng (DashScope/OpenRouter) tại Settings → AI Providers."

### 4. Bổ sung log chi tiết

Thêm `console.log` trước/sau `triggerPipeline` để lần sau debug nhanh:
```ts
console.log("[handleGenerate] triggering pipeline for goal", goal.id);
console.log("[handleGenerate] pipeline result:", r);
```

## 📦 Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/telegram-webhook/index.ts` | `handleGenerate`: điền defaults (channels, duration, brand_template_id); await `triggerPipeline` có timeout; báo lỗi cụ thể thay vì "✅ Pipeline đã khởi chạy" giả |
| `supabase/functions/telegram-webhook/index.ts` | `triggerPipeline`: return JSON `{ success, pipelines_created, error }` thay vì void |

## 🧪 Test

1. Gõ "Tạo chiến dịch tháng 5" trong Telegram → thấy message xác nhận có **số pipeline thực tế** (`✅ Đã tạo N pipeline…`) hoặc cảnh báo cụ thể
2. Gõ lại trong lúc gateway hết credits → thấy message "AI đang hết credits, thử lại sau" thay vì giả bộ OK
3. `/status` sau đó → list pipeline khớp với số đã báo
4. DB check: `agent_pipelines` có row với `goal_id = <mới>`

## ⏱ Ước tính
**30 phút** — chỉ sửa 2 hàm trong 1 file.

