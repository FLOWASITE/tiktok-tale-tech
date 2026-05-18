
## Mục tiêu

Widget "Kế hoạch đang chạy" hiện ở **dưới cùng** tab Tổng quan (sau Stats + Charts + Goals + Multi-Campaign Timeline). User phải scroll xa mới thấy. Đưa nó lên **ngay sau hàng 4 KPI cards** để là khối thứ 2 user nhìn thấy.

```text
Trước                          Sau
─────────                      ─────────
[Stats 4 cards]                [Stats 4 cards]
[Charts row]                   [Kế hoạch đang chạy] ◄── chèn ở đây
[Goals breakdown]              [Charts row]
[Kế hoạch đang chạy] ◄── cũ    [Goals breakdown]
[OrchestratorHealthPanel]      [OrchestratorHealthPanel]
```

## Implementation

`AICampaignOverview` accept thêm prop optional `afterStatsSlot?: React.ReactNode`. Trong JSX, sau `</div>` đóng Stats Row (sau dòng 427), nếu `afterStatsSlot` có thì render nó trước khi tới Charts Row.

`AgentDashboard.tsx`:
- Bỏ `<ActivePlansWidget>` ở vị trí cũ (giữa `AICampaignOverview` và `OrchestratorHealthPanel`)
- Truyền chính nó qua `afterStatsSlot` prop của `AICampaignOverview`

## Không đổi

- Nội dung widget, props `onOpenPlan/onViewAll/onCreate`, data flow
- Layout AICampaignOverview phần khác (Charts, Goals, OrchestratorHealthPanel)

## Sửa 2 file

- `src/components/agents/AICampaignOverview.tsx` (+1 prop, +1 dòng render)
- `src/pages/AgentDashboard.tsx` (chuyển vị trí JSX)
