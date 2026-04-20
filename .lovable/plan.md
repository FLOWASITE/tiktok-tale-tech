

# Fix: `/status` show toàn bộ org, không lọc theo brand đang active

## 🎯 Root cause

Trong `handleStatus` (telegram-webhook/index.ts dòng 603-727), 2 query pipelines (`running` + `recent`) chỉ filter theo `organization_id`:

```ts
.from("agent_pipelines")
.select(...)
.eq("organization_id", orgId)  // ← thiếu filter theo brand
```

Trong khi đó `/generate` đã gắn đúng `brand_template_id` vào goal (dòng 801). Goals → pipelines kế thừa brand qua `goal_id`. Vì vậy:
- User đổi brand sang "Beauty Pro" → `/status` vẫn show pipeline của brand "Spa X" cũ → tưởng "báo sai".
- Quota `pipelinesUsed` cũng đếm toàn org, không tách theo brand.

## 🔧 Fix

### 1. Lọc pipelines theo brand đang active

`handleStatus` resolve `activeBrandId` ngay đầu (đã có `getActiveBrandContext` ở dòng 730 — di chuyển lên trước query). Nếu có `activeBrandId`, filter pipelines:

```ts
const activeBrand = await getActiveBrandContext(supabase, orgId, chatId);
const activeBrandId = (activeBrand as any)?.id ?? null;

// Lấy goal IDs thuộc brand này trước
let goalIdsForBrand: string[] | null = null;
if (activeBrandId) {
  const { data: gs } = await supabase
    .from("agent_goals")
    .select("id")
    .eq("organization_id", orgId)
    .eq("brand_template_id", activeBrandId);
  goalIdsForBrand = (gs || []).map(g => g.id);
}

// Apply vào 2 query running + recent
let runningQ = supabase.from("agent_pipelines").select(...).eq("organization_id", orgId)...
if (goalIdsForBrand) runningQ = runningQ.in("goal_id", goalIdsForBrand.length ? goalIdsForBrand : ["00000000-0000-0000-0000-000000000000"]);
```

(Dùng sentinel UUID khi `goalIdsForBrand` rỗng để query trả 0 row sạch sẽ.)

### 2. Header hiển thị scope brand

Thêm dòng vào section "Tài khoản":
```
🎨 Brand đang xem: Beauty Pro  [Đổi]
```
→ User hiểu rõ stats đang scope theo brand nào, không nhầm lẫn.

### 3. Quota note

Quota tháng (`pipelinesUsed`) vẫn tính toàn org (vì giới hạn là theo subscription org). Thêm caption nhỏ:
```
• Pipeline (toàn org): 12/100
```
Để phân biệt với "đang chạy / hoàn tất" (đã lọc theo brand).

### 4. Hint khi brand không có pipeline

Nếu `goalIdsForBrand` rỗng (brand mới, chưa có goal), thay block "Pipeline đang chạy / Hoàn tất" bằng:
```
ℹ️ Brand "Beauty Pro" chưa có pipeline nào.
👉 /generate <mô tả> để tạo campaign đầu tiên.
```

### 5. Edge case: chưa chọn brand

Nếu `activeBrandId` null → giữ nguyên hành vi cũ (show toàn org), thêm hint:
```
💡 Mẹo: dùng /brand để chọn brand → /status sẽ chỉ show pipeline của brand đó.
```

## 📦 Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/telegram-webhook/index.ts` | `handleStatus`: resolve activeBrand đầu hàm; query goals theo brand → filter pipelines; thêm header brand scope + caption quota org-wide + hint empty/no-brand |

## 🧪 Test

1. Brand A có 2 pipeline đang chạy, Brand B có 0 → `/brand` chọn B → `/status` thấy "Brand đang xem: B" + "chưa có pipeline" (KHÔNG thấy 2 pipeline của A)
2. Đổi sang A → `/status` thấy 2 pipeline của A
3. Chưa chọn brand (active null) → `/status` show toàn org + hint chọn brand
4. Quota line ghi rõ "(toàn org)" để không gây nhầm

## ⏱ Ước tính
**20 phút** — chỉ sửa 1 hàm `handleStatus` trong 1 file.

