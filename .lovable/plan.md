## Vấn đề
Trong header "Gợi ý chủ đề" (`src/components/TopicSuggestionPanel.tsx` ~L391–976), nút refresh (vòng xoay) hiện là một icon ghost 5×5px nằm cuối cùng bên phải — nhỏ, thiếu nhãn, dễ bị bỏ qua. Trong khi đó nút "Kho chủ đề" và Source Badge lại to/nổi bật hơn dù mức ưu tiên thao tác thấp hơn refresh (user thường muốn re-roll gợi ý).

## Mục tiêu
Refresh = hành động chính trong khu vực gợi ý → phải nổi bật, có nhãn, vị trí ưu tiên. Các phần phụ (Kho chủ đề, Source Badge) lùi về vai trò thứ cấp nhưng vẫn truy cập được.

## Thay đổi

### `src/components/TopicSuggestionPanel.tsx` (header L391–976)

Sắp xếp lại thứ tự action bên phải header thành:

```text
[ 🔄 Làm mới gợi ý ]   [ Kho chủ đề (100) ]   [ ✨ AI source · ⓘ ]
   primary, có nhãn        outline secondary       badge nhỏ + tooltip
```

Cụ thể:

1. **Refresh button** — chuyển từ ghost icon-only sang **primary button có nhãn**:
   - `variant="default"` (hoặc outline với accent), `size="sm"`, bo `rounded-full`
   - Nội dung: `<RefreshCw /> Làm mới` (desktop) — giữ icon-only trên mobile (`<sm`) để tiết kiệm chỗ
   - Khi `isLoading`: icon spin + đổi nhãn thành `Đang tạo...`, disabled
   - Tooltip: "Tạo lại gợi ý chủ đề mới (Ctrl/Cmd+R)" — bonus shortcut nếu dễ thêm
   - Đặt **đầu tiên** trong cụm action (trái nhất bên phải)

2. **Kho chủ đề button** — giữ nhưng giảm độ nổi:
   - Đổi từ `bg-primary/10 border-primary/30 text-primary` sang `variant="outline"` neutral (giữ nhãn + count)
   - Vẫn rounded-full, cùng size sm với refresh

3. **Source Badge** — gộp vào 1 chip nhỏ ở cuối, hoặc đưa vào tooltip của refresh:
   - Phương án chọn: giữ badge nhưng đặt **cuối cùng**, size nhỏ hơn (`text-[9px] h-4`), không border đậm
   - Mục đích chỉ để user biết nguồn dữ liệu khi cần

4. **Responsive**:
   - `<sm`: refresh chỉ hiện icon (giữ nổi bật bằng màu primary, không phải ghost), Kho chủ đề hiển thị "Kho (100)" rút gọn, Source badge ẩn (hiện trong tooltip refresh)
   - `≥sm`: đầy đủ như trên

5. **Thứ tự DOM mới** trong `<div className="flex items-center gap-1.5 xs:gap-2">`:
   ```
   <RefreshButton />   ← mới, primary, có nhãn
   <KhoChuDePopover /> ← outline neutral
   <SourceBadge />     ← nhỏ, cuối
   ```

### Không đổi
- Logic `onRefresh`, `isLoading`, `disabled`, `currentSource` giữ nguyên
- Popover Kho chủ đề bên trong giữ nguyên
- Các component khác không bị ảnh hưởng

## Kết quả mong đợi
Nút "Làm mới" trở thành CTA rõ ràng nhất trong header gợi ý, user nhìn thấy ngay và 1 chạm là tạo lại — đúng với hành vi sử dụng phổ biến nhất khi gợi ý chưa ưng ý.
