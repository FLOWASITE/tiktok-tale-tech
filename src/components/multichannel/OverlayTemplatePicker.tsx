import { OVERLAY_TEMPLATES } from '@/config/overlayTemplates';
import { cn } from '@/lib/utils';

interface OverlayTemplatePickerProps {
  value: string;
  onChange: (templateId: string) => void;
}

export function OverlayTemplatePicker({ value, onChange }: OverlayTemplatePickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Chọn bố cục overlay</p>
      <div className="grid grid-cols-3 gap-1.5">
        {OVERLAY_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onChange(tpl.id)}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-md border text-center transition-colors',
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
}
