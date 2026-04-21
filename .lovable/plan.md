

# Thêm Slack vào sidebar (status: Soon)

## Mục tiêu
Sau khi thêm "Nhận Agent của bạn" (Telegram) vào sidebar, bổ sung thêm item **Slack** với badge "Soon" để báo trước tính năng sắp có. Click vào không điều hướng (hoặc dẫn tới placeholder), không bị highlight active sai.

## Thay đổi

### 1. `src/components/AppSidebar.tsx`
Mở rộng `agentItems` với type bổ sung `comingSoon?: boolean`:

```tsx
import { Bot, Send, Slack } from 'lucide-react';

type MenuItem = {
  title: string;
  titleKey: string;
  url: string;
  icon: LucideIcon;
  comingSoon?: boolean;
};

const agentItems: MenuItem[] = [
  { title: 'AI Agents', titleKey: 'app.sidebar.agents', url: '/agents', icon: Bot },
  { title: 'Nhận Agent của bạn', titleKey: 'app.sidebar.telegramAgent', url: '/agents/telegram', icon: Send },
  { title: 'Slack', titleKey: 'app.sidebar.slackAgent', url: '#', icon: Slack, comingSoon: true },
];
```

Render item: nếu `comingSoon` → wrap bằng `<button disabled>` thay vì `<NavLink>`, opacity-60, cursor-not-allowed, và hiện badge "Soon" bên phải (chỉ khi sidebar không collapsed):

```tsx
{item.comingSoon ? (
  <SidebarMenuButton disabled className="opacity-60 cursor-not-allowed">
    <item.icon className="mr-2 h-4 w-4" />
    {!collapsed && (
      <>
        <span className="flex-1">{t(item.titleKey)}</span>
        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-medium">
          Soon
        </Badge>
      </>
    )}
  </SidebarMenuButton>
) : (
  <SidebarMenuButton asChild>
    <NavLink to={item.url} end ...>...</NavLink>
  </SidebarMenuButton>
)}
```

### 2. i18n — thêm key `app.sidebar.slackAgent`
- `vi.json`: `"Slack"`
- `en.json`: `"Slack"`
- `th.json`: `"Slack"`

(Tên brand giữ nguyên 3 ngôn ngữ.)

## File thay đổi

| File | Loại |
|---|---|
| `src/components/AppSidebar.tsx` | thêm item Slack + render branch comingSoon + import `Slack` icon + `Badge` |
| `src/i18n/locales/vi.json` | thêm key |
| `src/i18n/locales/en.json` | thêm key |
| `src/i18n/locales/th.json` | thêm key |

## Test E2E
1. Reload → sidebar nhóm agents có 3 item: AI Agents, Nhận Agent của bạn, Slack
2. Slack item: icon Slack (lucide), label + badge "Soon" bên phải, opacity giảm, không click được
3. Hover Slack: không có hover bg đậm như item active (cursor not-allowed)
4. Collapse sidebar → chỉ thấy icon Slack mờ, badge ẩn
5. Mobile 707px: drawer hiển thị đúng, không trigger navigation khi tap
6. Switch EN/TH: "Soon" badge giữ nguyên (universal label), chỉ cần dịch nếu muốn

## Ước tính
**5-7 phút** — 1 file component + 3 file i18n.

## Rủi ro
- Disabled `SidebarMenuButton` có thể vẫn focusable bằng keyboard → thêm `tabIndex={-1}` nếu muốn skip hoàn toàn. Acceptable mặc định.
- Sau này khi launch Slack thật → chỉ cần đổi `comingSoon: false` + set `url: '/agents/slack'` + tạo route + page.

