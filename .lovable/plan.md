

# Fix: Telegram page bị spinner xoay mỗi 5 giây

## Nguyên nhân

`useTelegramBinding.ts` có **polling fallback chạy mỗi 5 giây** (thêm vào hôm trước để fix delay status):

```ts
const poll = setInterval(() => {
  if (document.visibilityState === 'visible') fetchBindings();
}, 5000);
```

Mỗi lần `fetchBindings()` chạy → `setLoading(true)` ngay đầu hàm → `TelegramLinkCard` có check:

```ts
if (loading) {
  return <Loader2 className="animate-spin" />; // ← spinner xuất hiện
}
```

→ Cứ mỗi 5 giây user thấy card biến mất → spinner xoay → card hiện lại. Trông như "trang xoay vòng liên tục".

Realtime subscription qua `postgres_changes` đã đủ để morph state ngay khi user /start bot, nên polling là redundant.

## Giải pháp

### 1. `src/hooks/useTelegramBinding.ts`

**Phương án A (chọn):** Tách flag `loading` (initial load only) khỏi background refetch.
- `fetchBindings(silent = false)`: chỉ `setLoading(true)` khi `silent === false`.
- Polling và realtime callback gọi `fetchBindings(true)` → không trigger spinner.
- **Tăng polling interval từ 5s → 15s** (realtime đã làm chính, poll chỉ là safety net).
- **Tắt polling hoàn toàn khi đã có `binding`** (không cần poll nữa vì realtime sẽ bắt event delete/update).

### 2. `src/components/agents/TelegramLinkCard.tsx`

Không đụng — chỉ cần fix gốc ở hook. Sau fix, `loading` sẽ chỉ `true` đúng 1 lần khi mount, không còn flicker.

## File thay đổi

| File | Thay đổi |
|---|---|
| `src/hooks/useTelegramBinding.ts` | thêm param `silent` cho `fetchBindings`; polling gọi silent + chỉ chạy khi chưa có binding + interval 15s |

## Test E2E
1. Mở `/agents/telegram` (đã connected): spinner xuất hiện 1 lần khi mount → sau đó card hiển thị ổn định, KHÔNG còn spinner mỗi 5s
2. Chưa connected → vào Telegram bấm Start: card vẫn morph thành "đã kết nối" trong < 3s nhờ realtime
3. Nếu realtime bị firewall: poll 15s vẫn pick up status mới (silent, không flicker)
4. Tab background: poll dừng (nhờ check `visibilityState`)

## Ước tính
**3 phút** — sửa 1 hook, ~10 dòng.

## Rủi ro
Không. Realtime subscription giữ nguyên là source of truth chính.

