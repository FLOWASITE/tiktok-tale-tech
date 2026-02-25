

## Thêm "Flowa Team" vào Sidebar — Mục nổi bật nhất, trên Dashboard

### Mô tả
Thêm mục **"Flowa Team"** (chức năng Chat Agent) vào sidebar, đặt ở vị trí **trên cùng** trước Dashboard, với thiết kế nổi bật nhất để thu hút sự chú ý.

### Thay đổi

#### 1. Tạo trang `/chat` mới (`src/pages/FlowaChatPage.tsx`)
- Trang toàn màn hình chứa `TopicAIChatbot` ở chế độ `fullscreen`
- Tự động chọn brand mặc định nếu có
- Wrapped trong `AppLayout` + `ProtectedRoute`

#### 2. Đăng ký route trong `src/App.tsx`
- Thêm route `/chat` trỏ đến `FlowaChatPage`
- Đặt trong khối protected routes

#### 3. Cập nhật Sidebar (`src/components/AppSidebar.tsx`)

**Thêm mục "Flowa Team" đặc biệt** phía trên nhóm Quick Access:
- Icon: `Sparkles` (hoặc `MessageSquare` kết hợp gradient)
- Vị trí: Ngay sau header logo, **trước** Dashboard
- Thiết kế nổi bật:
  - Nền gradient `from-primary/15 to-secondary/15`
  - Border gradient `border-primary/30`
  - Hiệu ứng pulse nhẹ hoặc glow
  - Font đậm hơn các mục khác
  - Badge "AI" nhỏ bên cạnh

```text
+---------------------------+
| [Logo] Flowa PRO          |
+---------------------------+
| ★ Flowa Team  [AI]        |  <-- Mục mới, nổi bật nhất
+---------------------------+
| ● QUICK ACCESS            |
|   Dashboard               |
|   Kho Y Tuong             |
|   Core Content            |
+---------------------------+
| ● CONTENT                 |
|   ...                     |
```

### Chi tiết kỹ thuật

**File 1: `src/pages/FlowaChatPage.tsx`** (mới)
- Import `TopicAIChatbot` từ `@/components/topic/TopicAIChatbot`
- Sử dụng `useBrandTemplates` để lấy brand mặc định
- Render chatbot full-height trong container

**File 2: `src/App.tsx`**
- Thêm `<Route path="/chat" element={<ProtectedRoute><AppLayout><FlowaChatPage /></AppLayout></ProtectedRoute>} />`

**File 3: `src/components/AppSidebar.tsx`**
- Thêm component `FlowaTeamMenuItem` riêng với styling đặc biệt:
  - Gradient background khi active và cả khi inactive (nhẹ hơn)
  - Animation shimmer/glow nhẹ
  - Icon `Sparkles` với hiệu ứng rotate
- Đặt trước `quickItems` map, ngay sau `SidebarHeader`
- Hỗ trợ cả trạng thái collapsed (chỉ hiện icon với glow)

**File 4: i18n** — Thêm key `app.sidebar.flowaTeam` cho cả `vi` và `en`

### Kết quả
- "Flowa Team" là mục đầu tiên và nổi bật nhất trong sidebar
- Click vào sẽ mở trang chat agent toàn màn hình tại `/chat`
- Giữ nguyên toàn bộ cấu trúc sidebar hiện tại
