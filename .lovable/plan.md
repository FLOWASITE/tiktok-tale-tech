

# Trang Admin: Báo cáo Edge Functions

## Tổng quan
Tạo trang `/admin/edge-functions` hiển thị toàn bộ **120+ Edge Functions** với thông tin: category, dependencies, trạng thái deploy, và đánh giá rủi ro.

## Dữ liệu
Vì Edge Function logs không có sẵn analytics tổng hợp (API trả về rỗng), báo cáo sẽ dựa trên **phân tích tĩnh codebase** — phân loại từng function theo:
- **Category**: AI Content, Social Publishing, OAuth, Payment, Admin, Testing, Industry, Image Processing
- **Dependencies**: Liệt kê các `_shared` modules được import
- **External APIs**: Zalo, Facebook, Instagram, LinkedIn, OpenAI, Gemini, VNPay, KIE, PoYo...
- **Risk Level**: Dựa trên số external dependencies và độ phức tạp
- **JWT Config**: `verify_jwt = false` hay không (từ `config.toml`)

## Thay đổi

### 1. File mới: `src/pages/AdminEdgeFunctions.tsx`
- Bảng liệt kê tất cả 120 functions
- Cột: Name, Category, Dependencies, External APIs, Risk, JWT Status
- Filter theo category
- Tìm kiếm theo tên
- Badge màu cho risk level (low/medium/high/critical)
- Summary cards: tổng functions, phân bổ theo category, số functions high-risk

### 2. File mới: `src/data/edgeFunctionRegistry.ts`
- Registry tĩnh chứa metadata của tất cả edge functions
- Phân loại 120+ functions vào 10 categories
- Map dependencies và external APIs cho từng function

### 3. Sửa: `src/app/routes.tsx`
- Thêm route `/admin/edge-functions` → `AdminEdgeFunctions`

### 4. Sửa: `src/pages/AdminDashboard.tsx`
- Thêm card link đến trang Edge Functions

## Files

| File | Thay đổi |
|------|----------|
| `src/data/edgeFunctionRegistry.ts` | Mới — registry metadata 120+ functions |
| `src/pages/AdminEdgeFunctions.tsx` | Mới — trang báo cáo với bảng, filter, summary |
| `src/app/routes.tsx` | Thêm route admin |
| `src/pages/AdminDashboard.tsx` | Thêm link card |

