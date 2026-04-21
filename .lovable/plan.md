

# Bỏ Welcome Modal onboarding

## Mục tiêu
Loại bỏ popup "Chào mừng đến Flowa! 🎉" (WelcomeModal) hiển thị ở Dashboard sau khi đăng nhập.

## Thay đổi

### 1. Tìm điểm gọi `startWithWelcome()` / render `<WelcomeModal>`
Cần xác định nơi `CoachmarkProvider` được mount + nơi auto-trigger `startWithWelcome` (có thể trong `Dashboard.tsx` hoặc `AppLayout.tsx`). Plan: chặn modal hiển thị bằng 1 trong 2 cách:

**Cách A (khuyến nghị, ít invasive)**: Trong `CoachmarkContext.tsx`, sửa `startWithWelcome` thành no-op:
```ts
const startWithWelcome = useCallback(() => {
  // Disabled — onboarding welcome modal removed per user request
  return;
}, []);
```
→ Modal không bao giờ mở, code coachmark khác (manual `start()` từ help button) vẫn dùng được nếu sau này muốn bật lại.

**Cách B (triệt để)**: Xóa hẳn `<WelcomeModal>` render trong `CoachmarkProvider` hoặc nơi mount + xóa export. Rủi ro cao hơn nếu có chỗ khác import.

→ **Chọn cách A**.

### 2. Optional cleanup
- Xóa localStorage key `coachmark-never-show` nếu user trước đó đã tick "Không hiển thị lại" — không cần, vì modal đã bị disable hoàn toàn.
- Giữ nguyên `WelcomeModal.tsx` component file (không xóa) để dễ revert sau này.

## File thay đổi

| File | Loại |
|---|---|
| `src/components/onboarding/CoachmarkContext.tsx` | sửa `startWithWelcome` thành no-op |

## Test E2E
1. Logout → login lại → vào Dashboard → **không thấy popup "Chào mừng đến Flowa"**
2. Các tính năng khác (sidebar, brand selector, agent dashboard) vẫn hoạt động bình thường
3. Nếu có nút "Hướng dẫn" gọi trực tiếp `start()` (không qua `startWithWelcome`) → vẫn chạy coachmark tour như cũ

## Ước tính
**2 phút** — sửa 1 hàm.

## Rủi ro
Không có. Cách A reversible bằng cách restore lại logic cũ.

