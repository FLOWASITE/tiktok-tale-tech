import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChannelIcon } from '@/components/ui/channel-icon';

export type PinType = 'auto' | 'image' | 'carousel' | 'video' | 'idea';

interface Props {
  value: PinType | null | undefined;
  onChange: (value: PinType) => void;
  disabled?: boolean;
}

const PIN_TYPE_OPTIONS: { value: PinType; label: string; hint: string }[] = [
  { value: 'auto', label: 'Auto-detect', hint: 'Quyết định theo số ảnh / video' },
  { value: 'image', label: 'Single image Pin', hint: 'Một ảnh, hiệu quả ổn định' },
  { value: 'carousel', label: 'Carousel Pin', hint: '2-5 ảnh trong cùng Pin' },
  { value: 'video', label: 'Video Pin', hint: 'Video MP4/MOV (≤ 2GB)' },
  { value: 'idea', label: 'Idea Pin', hint: 'Nhiều slide story-style' },
];

/**
 * UI to override Pinterest pin type per-content.
 * Default is `auto` which lets publish-pinterest pick based on media.
 */
export function PinterestPinTypeSelector({ value, onChange, disabled }: Props) {
  const current = value ?? 'auto';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <ChannelIcon channel="pinterest" className="text-[#E60023]" size={16} />
        <Label className="text-xs font-medium">Loại Pin</Label>
      </div>
      <Select value={current} onValueChange={(v) => onChange(v as PinType)} disabled={disabled}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PIN_TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="flex flex-col items-start">
                <span className="text-sm">{opt.label}</span>
                <span className="text-[11px] text-muted-foreground">{opt.hint}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
