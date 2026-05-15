# Gộp "Nhân vật" vào Video Studio

## Mục tiêu
Bỏ mục "Nhân vật" độc lập trên sidebar và đưa nó vào trong **Video Studio** dưới dạng một tab — vì Character Profiles chỉ dùng cho video generation (giữ nhất quán ngoại hình giữa các scene).

## Thay đổi

### 1. `src/components/AppSidebar.tsx`
- Bỏ dòng `{ title: 'Nhân vật', url: '/characters', icon: Users }` (line 281) khỏi `contentItems`.

### 2. `src/pages/VideoStudioPage.tsx`
- Thêm tab mới `characters` vào mảng `TABS` (đặt sau `gallery`, trước `costs`):
  - label: "Nhân vật", icon: `Users`, hint: "Quản lý nhân vật cho video"
- `TabsList`: đổi `md:grid-cols-5` → `md:grid-cols-6`.
- Thêm `<TabsContent value="characters">` render nội dung của `CharactersPage` (extract phần body — không cần Helmet/layout).
- Xoá Card "Nhân vật → Mở trang quản lý" (lines 109-123) vì giờ đã có tab ngay tại đây.

### 3. `src/pages/CharactersPage.tsx`
- Refactor nhẹ: tách phần content (list + actions) thành component `<CharactersPanel />` export riêng để Video Studio import. Page cũ `CharactersPage` vẫn tồn tại như wrapper (Helmet + layout container) bọc `<CharactersPanel />`.

### 4. Route `/characters`
- **Giữ nguyên** route để backward-compat (links cũ, deep-link từ scripts, banner cũ vẫn dùng được). Không redirect để tránh phá vỡ bookmark/email.

### 5. i18n
- Không xoá key `app.sidebar.characters` (có thể dùng lại cho tab label nếu muốn).

## Không thay đổi
- Logic CRUD nhân vật, hooks `useCharacterProfiles`, `CharacterPicker`, `MultiCharacterPicker`.
- DB schema, edge functions.
- Trang `/characters` standalone vẫn truy cập được.

## QA
- Sidebar: không còn mục "Nhân vật".
- Video Studio: tab "Nhân vật" mới hiện cuối hàng, click → list characters + nút tạo mới hoạt động như trang cũ.
- Mở trực tiếp `/characters` vẫn render đúng.
- Responsive 707px (viewport user): `grid-cols-3` mobile vẫn ổn (6 tab xuống 2 hàng).
