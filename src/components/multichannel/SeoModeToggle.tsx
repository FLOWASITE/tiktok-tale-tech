import { Target } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Props {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export function SeoModeToggle({ enabled, onChange, disabled }: Props) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <label
            className={cn(
              'inline-flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 cursor-pointer transition-colors',
              enabled && 'border-primary/40 bg-primary/5',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Target className={cn('w-4 h-4', enabled ? 'text-primary' : 'text-muted-foreground')} />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium text-foreground">Chế độ SEO</span>
              <span className="text-[11px] text-muted-foreground">
                {enabled ? 'Bắt đầu từ pillar + keyword' : 'Bắt đầu từ ý tưởng (mặc định)'}
              </span>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={onChange}
              disabled={disabled}
              aria-label="Bật chế độ SEO"
            />
          </label>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          Bật khi bạn muốn tạo nội dung long-form (Website/Blog/WordPress) bám theo keyword SEO. AI sẽ gợi ý topic từ pillar + keyword bạn chọn.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
