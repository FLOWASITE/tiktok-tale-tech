

# Di chuyển bộ lọc Chiến dịch vào panel lọc chung (icon Phễu)

## Mô tả
Hiện tại `CampaignSelector` đang nằm riêng bên ngoài, cạnh thanh filter chính. Cần di chuyển nó vào bên trong panel lọc nâng cao (mở khi click icon Filter/Phễu).

## Thay đổi

### 1. `src/components/MultiChannelFilters.tsx`
- Thêm props: `campaignFilter`, `onCampaignFilterChange`, `campaigns` (danh sách chiến dịch)
- Thêm Select dropdown "Chiến dịch" vào trong `CollapsibleContent`, cạnh Brand và Date Range
- Cập nhật `activeFilterCount` trong parent để bao gồm campaign

### 2. `src/pages/MultiChannel.tsx`
- Xóa `<CampaignSelector>` riêng biệt (dòng 389-394)
- Truyền `campaignFilter`, `onCampaignFilterChange` và danh sách campaigns vào `<MultiChannelFilters>`
- Bỏ wrapper `flex-col lg:flex-row` vì không còn 2 phần tử cạnh nhau

### Files
| File | Thay đổi |
|------|----------|
| `src/components/MultiChannelFilters.tsx` | Thêm campaign selector vào panel lọc nâng cao |
| `src/pages/MultiChannel.tsx` | Xóa CampaignSelector riêng, truyền props campaign vào MultiChannelFilters |

