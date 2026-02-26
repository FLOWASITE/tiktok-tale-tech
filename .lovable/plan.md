

## Cải thiện UI: Core Content (Step 2) & Multi Content (Step 4)

### Tổng quan

Nâng cấp giao diện 2 bước quan trọng nhất trong wizard: bước tạo Core Content và bước cấu hình đa kênh, theo hướng đẹp hơn, gọn hơn, và thông minh hơn.

---

### A. Step 2: Core Content - Cải thiện

**Hiện tại:** Form khá dài với nhiều field cùng level, thiếu visual hierarchy, streaming card đơn điệu.

**Cải thiện:**

1. **Header Card nổi bật hơn** - Thêm gradient background, icon lớn hơn, và description rõ ràng hơn cho section "Tạo Core Content"

2. **Gom nhóm tuỳ chọn thành Tabs/Sections**
   - Tab "Cơ bản": Content Angle + Length Mode (2 cột)
   - Tab "Nâng cao": Audience/Persona + Auto Research
   - Giảm cognitive load bằng cách tách thành 2 nhóm rõ ràng

3. **Length Mode - Visual Cards thay vì plain buttons**
   - Thêm icon cho mỗi mode (FileText nhỏ/trung/lớn)
   - Hiển thị estimated time bên cạnh word count
   - Badge "Phổ biến" thay vì "Khuyến khích"

4. **Core Content Result Card cải thiện**
   - Thêm gradient border khi đã tạo thành công
   - Key Messages hiển thị dạng numbered list thay vì badges (dễ đọc hơn)
   - Thêm mini progress ring cho Quality Score
   - Nút "Tạo lại" có confirm dialog tránh click nhầm

5. **AI Context Summary đẹp hơn**
   - Từ badges nhỏ sang progress dots/chips có icon tương ứng
   - Tooltip giải thích mỗi context item

### B. Step 4: Đa kênh - Cải thiện

**Hiện tại:** Rất dài, nhiều cards chồng lên nhau, channel grid chiếm nhiều không gian.

**Cải thiện:**

1. **Channel Selection gọn hơn**
   - Compact mode: Channels hiển thị dạng icon chips (không text) với tooltip
   - Nhóm categories collapsible, mặc định expand "Mạng xã hội" (phổ biến nhất)
   - Counter badge cho mỗi category ("3/5 đã chọn")

2. **Targeting Card gom lại**
   - Product + Persona hiển thị inline dạng 2-column dropdown compact
   - Content Angle chuyển sang chip selector nhỏ (đã chọn ở Step 2, ở đây chỉ hiện readonly hoặc cho override)

3. **Journey Stage compact**
   - Chuyển từ Card lớn sang inline selector với 3-5 stage buttons ngang
   - Bỏ Card wrapper, chỉ label + button group

4. **Hook Generator & Summary**
   - Hook section default collapsed khi chưa có hook
   - Summary hiển thị compact hơn với channel icons thay vì text dài

5. **Footer Info gọn lại**
   - Từ Card lớn sang simple toggle row (1 line)

### C. Shared Improvements

1. **Section dividers đẹp hơn** - Thêm subtle gradient dividers giữa các sections
2. **Smooth transitions** - AnimatePresence cho mỗi section khi mở/đóng
3. **Mobile responsive** - Stack 1 column trên mobile, compact spacing

---

### Chi tiết kỹ thuật

**Files cần sửa:**
- `src/components/multichannel/MultiChannelFormWizard.tsx` - Refactor Step 2 layout (gom options), Step 4 layout (compact channels, inline journey)
- `src/components/multichannel/streaming/CoreContentStreamingCard.tsx` - Không đổi (đã tốt)
- Tạo mới: `src/components/multichannel/CompactChannelGrid.tsx` - Component channel selection compact với icon-only mode
- Tạo mới: `src/components/multichannel/InlineJourneySelector.tsx` - Journey stage selector dạng button group ngang

**Thay đổi chính trong MultiChannelFormWizard.tsx:**

Step 2:
- Wrap options trong 2 nhóm: "Cơ bản" (Angle + Length) vs "Nâng cao" (Audience + Research)
- Length Mode cards thêm icon và estimated time
- Result card: numbered key messages, gradient border, confirm on "Tạo lại"

Step 4:
- Channel grid: icon-only compact mode với category counters
- Journey stage: inline button group thay vì Card wrapper
- Footer info: single row toggle
- Targeting: compact 2-column layout

