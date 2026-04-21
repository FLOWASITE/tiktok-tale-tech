

# Fix: `derivedContentGoal is not defined` khi tạo bài đơn lẻ qua Telegram

## Nguyên nhân (đã xác định từ log + code)

Edge function `generate-multichannel` boot OK nhưng **crash runtime** với:
```
ReferenceError: derivedContentGoal is not defined
at index.ts:3837:52 (compiled, thực tế line 3901)
```

Tại 3 chỗ trong `generate-multichannel/index.ts` (lines **3901, 4050, 4328**) code dùng:
```ts
contentGoal: formData.contentGoal || derivedContentGoal,
```

Nhưng biến đúng được khai báo ở **line 3465** là `contentGoal` (không phải `derivedContentGoal`):
```ts
let contentGoal = formData.contentGoal || 'education';
if (!formData.contentGoal && formData.targetJourneyStage) {
  contentGoal = JOURNEY_TO_GOAL_MAP[formData.targetJourneyStage] || 'education';
}
```

→ Khi Telegram bot gọi `generate-multichannel` (single post Facebook), function chạy đến block tính `dynamicMaxTokens` → đụng `derivedContentGoal` không tồn tại → throw → bot báo **"Tạo bài lỗi: derivedContentGoal is not defined"**.

Bug này tồn tại trên cả manual flow lẫn agent flow — chỉ chưa lộ vì các path khác may mắn không vào nhánh code đó. Telegram single-post là path **đầu tiên** trigger nó.

## Giải pháp

Đổi cả 3 reference `derivedContentGoal` → `contentGoal` (biến đã có sẵn trong cùng scope, line 3465).

**File:** `supabase/functions/generate-multichannel/index.ts`

3 chỗ cần sửa:

```ts
// Line 3901
contentGoal: formData.contentGoal || derivedContentGoal,
// → 
contentGoal: formData.contentGoal || contentGoal,

// Line 4050 — same fix
// Line 4328 — same fix
```

Vì `formData.contentGoal || contentGoal` redundant (biến `contentGoal` đã được resolve từ `formData.contentGoal` ở line 3465), simplify thành:

```ts
contentGoal: contentGoal,
```

→ rõ nghĩa hơn, không có biến undefined, không đổi behavior.

## Files thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/generate-multichannel/index.ts` | Sửa 3 reference `derivedContentGoal` → `contentGoal` (lines 3901, 4050, 4328) |

## Test E2E

1. Telegram → "TẠO 1 content cho kênh Facebook" → bot detect `generate_single` + channel=facebook → gọi `generate-multichannel` → **chạy thành công** → trả preview + link Mini App trong ~30s.
2. Manual flow `/multichannel` → tạo bài Facebook bình thường → vẫn chạy OK (không regression).
3. Agent campaign approve → chạy 6 bài → không lỗi runtime.

## Ước tính
**2 phút** — sửa 3 token trong cùng 1 file.

## Rủi ro
Không. Chỉ rename biến về đúng tên trong scope, không đổi logic.

