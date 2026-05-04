import { Target, Info, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Props {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  isDefault?: boolean;
  onSetAsDefault?: () => void;
}

export function SeoModeToggle({ enabled, onChange, disabled, isDefault, onSetAsDefault }: Props) {
  const showDefaultControls = typeof onSetAsDefault === 'function';

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          'inline-flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 transition-colors',
          enabled && 'border-primary/40 bg-primary/5',
          disabled && 'opacity-50',
        )}
      >
        <Target
          className={cn('w-4 h-4 shrink-0', enabled ? 'text-primary' : 'text-muted-foreground')}
        />
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">Chế độ SEO</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Thông tin về chế độ SEO"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end" className="max-w-xs space-y-2 text-xs">
                <div>
                  <p className="font-semibold text-foreground mb-1">Khi nào nên bật?</p>
                  <p className="text-muted-foreground">
                    Khi bạn cần nội dung long-form (Website / Blog / WordPress) bám sát keyword để
                    lên top Google.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Bật xong cần điền gì?</p>
                  <ol className="list-decimal pl-4 space-y-0.5 text-muted-foreground">
                    <li>
                      Chọn <b>Pillar</b> (cụm chủ đề lớn).
                    </li>
                    <li>
                      Chọn 1–5 <b>Keyword</b> trong pillar đó.
                    </li>
                    <li>
                      AI sẽ gợi ý <b>Topic</b> phù hợp → bạn chọn 1.
                    </li>
                  </ol>
                </div>
                <p className="text-muted-foreground italic">
                  Bấm "Đặt làm mặc định" để mọi form mới tự bật/tắt theo lựa chọn này.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {enabled
              ? 'Cần chọn Pillar → Keyword trước khi tạo'
              : 'Bắt đầu từ ý tưởng (mặc định)'}
          </span>
          {showDefaultControls && (
            <div className="mt-1 flex items-center gap-2">
              {isDefault ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/60 border border-border rounded-full px-1.5 py-0.5">
                  <Check className="w-2.5 h-2.5" />
                  Mặc định
                </span>
              ) : (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onSetAsDefault}
                  className="text-[10px] font-medium text-primary hover:underline disabled:opacity-50"
                >
                  Đặt làm mặc định
                </button>
              )}
            </div>
          )}
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onChange}
          disabled={disabled}
          aria-label="Bật chế độ SEO"
        />
      </div>
    </TooltipProvider>
  );
}
