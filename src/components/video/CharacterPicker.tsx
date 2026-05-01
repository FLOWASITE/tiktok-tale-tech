import { useCharacterProfiles, type CharacterProfile, type CharacterAppearance } from '@/hooks/useCharacterProfiles';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CharacterPickerProps {
  value: string | null;
  onChange: (profileId: string | null, profile: CharacterProfile | null) => void;
  className?: string;
}

export function CharacterPicker({ value, onChange, className }: CharacterPickerProps) {
  const { profiles, isLoading } = useCharacterProfiles();

  if (isLoading || profiles.length === 0) return null;

  return (
    <div className={cn("space-y-1", className)}>
      <label className="text-xs font-medium text-muted-foreground">Nhân vật</label>
      <Select
        value={value || 'none'}
        onValueChange={v => {
          if (v === 'none') {
            onChange(null, null);
          } else {
            const p = profiles.find(p => p.id === v) || null;
            onChange(v, p);
          }
        }}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Không chọn nhân vật" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">Không dùng nhân vật</span>
          </SelectItem>
          {profiles.map(p => {
            const app = p.appearance as CharacterAppearance;
            return (
              <SelectItem key={p.id} value={p.id}>
                <div className="flex items-center gap-2">
                  {p.reference_image_url ? (
                    <img src={p.reference_image_url} alt="" className="w-5 h-5 rounded-md object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span>{p.name}</span>
                  {app.gender && <span className="text-[10px] text-muted-foreground">· {app.gender}</span>}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
