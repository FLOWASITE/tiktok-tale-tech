

# Thông báo chuông tự động khi tạo Script Video

## Thay đổi

### File: `src/hooks/useScripts.ts`
- Import `supabase` (đã có) và `useAuth` (đã có)
- Sau khi `generateScript` thành công (dòng 71-76), insert notification type `script_generated`:
  - Title: "Kịch bản đã sẵn sàng!"
  - Message: `Kịch bản "{topic}" đã được tạo thành công`
  - Data: `{ script_id: newScript.id }`
- Sau khi `analyzeScriptInBackground` hoàn tất thành công (dòng ~129), insert notification type `script_analysis_done`:
  - Title: "Phân tích kịch bản hoàn tất!"  
  - Message: `Kịch bản "{title}" đã được chấm điểm: {score}/100`
  - Data: `{ script_id: script.id, score }`

### File: `src/components/NotificationDropdown.tsx`
- Import thêm icon `FileText, BarChart3` từ lucide-react
- Thêm 2 type config:
  - `script_generated`: icon `FileText`, màu indigo
  - `script_analysis_done`: icon `BarChart3`, màu amber
- Navigation: click → navigate `/` (trang Scripts)

## Chi tiết
Không cần `useRef` vì `generateScript` và `analyzeScriptInBackground` là hàm gọi 1 lần (không phải useEffect loop). Insert notification ngay sau khi có kết quả thành công. Realtime subscription trong `useNotifications` sẽ tự động cập nhật badge chuông.

