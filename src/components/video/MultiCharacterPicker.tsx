import { useCharacterProfiles, type CharacterProfile, type CharacterAppearance } from '@/hooks/useCharacterProfiles';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { User, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiCharacterPickerProps {
  value: string[];
  onChange: (profileIds: string[], profiles: CharacterProfile[]) => void;
  className?: string;
  max?: number;
}

export function MultiCharacterPicker({ value, onChange, className, max = 3 }: MultiCharacterPickerProps) {
  const { profiles, isLoading } = useCharacterProfiles();

  if (isLoading || profiles.length === 0) return null;

  const selected = profiles.filter(p => value.includes(p.id));
  const available = profiles.filter(p => !value.includes(p.id));

  const addCharacter = (id: string) => {
    if (value.length >= max) return;
    const newIds = [...value, id];
    onChange(newIds, profiles.filter(p => newIds.includes(p.id)));
  };

  const removeCharacter = (id: string) => {
    const newIds = value.filter(v => v !== id);
    onChange(newIds, profiles.filter(p => newIds.includes(p.id)));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-xs font-medium text-muted-foreground">Nhân vật ({selected.length}/{max})</label>
      
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((p, idx) => (
            <Badge key={p.id} variant={idx === 0 ? "default" : "secondary"} className="gap-1 pr-1 text-xs">
              {p.reference_image_url ? (
                <img src={p.reference_image_url} alt="" className="w-4 h-4 rounded-sm object-cover" />
              ) : (
                <User className="w-3 h-3" />
              )}
              {p.name}
              {idx === 0 && <span className="text-[9px] opacity-70 ml-0.5">chính</span>}
              <button onClick={() => removeCharacter(p.id)} className="ml-0.5 hover:bg-foreground/10 rounded-sm p-0.5">
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {value.length < max && available.length > 0 && (
        <Select onValueChange={addCharacter}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="+ Thêm nhân vật..." />
          </SelectTrigger>
          <SelectContent>
            {available.map(p => {
              const app = p.appearance as CharacterAppearance;
              return (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-2">
                    {p.reference_image_url ? (
                      <img src={p.reference_image_url} alt="" className="w-4 h-4 rounded-sm object-cover" />
                    ) : (
                      <User className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span>{p.name}</span>
                    {app.gender && <span className="text-[10px] text-muted-foreground">· {app.gender}</span>}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
