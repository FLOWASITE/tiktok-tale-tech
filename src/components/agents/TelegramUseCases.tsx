import { MessageCircle, BarChart3, Target, PauseCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Settings2 } from 'lucide-react';

interface UseCase {
  icon: typeof MessageCircle;
  title: string;
  example: string;
}

const USE_CASES: UseCase[] = [
  { icon: MessageCircle, title: 'Chat tự nhiên', example: '"tạo bài Facebook bán kem mùa hè"' },
  { icon: BarChart3, title: 'Hỏi quota', example: '"/status" hoặc "còn bao nhiêu lượt?"' },
  { icon: Target, title: 'Tạo campaign', example: '"/generate" hoặc mô tả tự do' },
  { icon: PauseCircle, title: 'Quản lý pipeline', example: '"/pause", "/resume"' },
];

interface CommandRow { cmd: string; desc: string; perm?: string }

const COMMAND_GROUPS: { label: string; items: CommandRow[] }[] = [
  {
    label: 'Cá nhân',
    items: [
      { cmd: '/start <token>', desc: 'Kết nối tài khoản (link từ app)' },
      { cmd: '/status', desc: 'Xem quota pipeline tháng này' },
      { cmd: '/help', desc: 'Xem danh sách lệnh' },
    ],
  },
  {
    label: 'Tạo nội dung',
    items: [
      { cmd: '/generate <mô tả>', desc: 'Tạo campaign mới từ chat', perm: 'can_create_goals' },
    ],
  },
  {
    label: 'Quản trị',
    items: [{ cmd: '/link_group', desc: 'Admin link group vào tổ chức', perm: 'admin' }],
  },
];

export function TelegramUseCases() {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Gợi ý nhanh</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {USE_CASES.map(({ icon: Icon, title, example }) => (
          <div
            key={title}
            className="rounded-lg border bg-card hover:bg-muted/30 transition-colors p-2.5 flex gap-3"
          >
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium">{title}</div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">{example}</div>
            </div>
          </div>
        ))}
      </div>

      <Accordion type="single" collapsible>
        <AccordionItem value="commands" className="border rounded-lg px-3">
          <AccordionTrigger className="py-2.5 text-sm hover:no-underline">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <span>Xem tất cả lệnh</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              {COMMAND_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {group.label}
                  </div>
                  <div className="space-y-1.5">
                    {group.items.map((item) => (
                      <div key={item.cmd} className="flex items-start gap-2 text-sm flex-wrap">
                        <code className="text-primary font-mono text-xs bg-primary/5 px-2 py-0.5 rounded shrink-0">
                          {item.cmd}
                        </code>
                        <span className="text-muted-foreground flex-1 min-w-0">{item.desc}</span>
                        {item.perm && (
                          <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                            {item.perm}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
