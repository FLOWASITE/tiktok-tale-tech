import { OVERLAY_TEMPLATES } from '@/config/overlayTemplates';
import { cn } from '@/lib/utils';

const TEMPLATE_GROUPS = [
  { key: 'ai', label: 'Tự động' },
  { key: 'conversion', label: 'Chuyển đổi' },
  { key: 'education', label: 'Giáo dục' },
  { key: 'trust', label: 'Niềm tin' },
  { key: 'editorial', label: 'Cá tính' },
] as const;

interface OverlayTemplatePickerProps {
  value: string;
  onChange: (templateId: string) => void;
}

export function OverlayTemplatePicker({ value, onChange }: OverlayTemplatePickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Chọn bố cục overlay</p>
      <div className="space-y-3">
        {TEMPLATE_GROUPS.map((group) => {
          const templates = OVERLAY_TEMPLATES.filter((tpl) => tpl.category === group.key);
          if (templates.length === 0) return null;

          return (
            <div key={group.key} className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => onChange(tpl.id)}
                    className={cn(
                      'flex min-h-24 flex-col items-center gap-1 p-2 rounded-md border text-center transition-colors',
                      'hover:bg-accent/50',
                      value === tpl.id
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                        : 'border-border/50 bg-background'
                    )}
                  >
                    <span className="text-lg leading-none">{tpl.icon}</span>
                    <span className="text-[11px] font-medium text-foreground leading-tight">{tpl.name}</span>
                    <span className="text-[9px] text-muted-foreground leading-tight line-clamp-2">{tpl.description}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
