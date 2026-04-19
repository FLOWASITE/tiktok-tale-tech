import { TelegramBotConfigCard } from '@/components/agents/TelegramBotConfigCard';
import { TelegramLinkCard } from '@/components/agents/TelegramLinkCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { canManageMembers } from '@/types/organization';

export default function AgentTelegramPage() {
  const { currentRole } = useOrganizationContext();
  const isAdmin = currentRole ? canManageMembers(currentRole) : false;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <TelegramLinkCard />
        {isAdmin && <TelegramBotConfigCard />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lệnh bot hỗ trợ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><code className="text-primary">/start &lt;token&gt;</code> — Kết nối tài khoản (link từ app)</div>
          <div><code className="text-primary">/generate &lt;mô tả&gt;</code> — Tạo campaign mới (cần can_create_goals)</div>
          <div><code className="text-primary">/status</code> — Xem quota pipeline tháng này</div>
          <div><code className="text-primary">/link_group</code> — Admin link group vào tổ chức</div>
          <div><code className="text-primary">/help</code> — Xem danh sách lệnh</div>
        </CardContent>
      </Card>
    </div>
  );
}
