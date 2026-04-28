import { FileText, Inbox } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Props {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptyReportState({
  title = 'Chưa có dữ liệu',
  description = 'Thử chọn khoảng ngày khác hoặc bắt đầu tạo nội dung.',
  icon,
}: Props) {
  return (
    <Card className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="rounded-full bg-muted p-3 text-muted-foreground">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
    </Card>
  );
}

EmptyReportState.IconContent = <FileText className="h-6 w-6" />;
