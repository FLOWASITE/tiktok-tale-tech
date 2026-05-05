import { useProductProfiles } from '@/hooks/useProductProfiles';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Package, X, Star, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BrandProduct } from '@/types/product';

interface MultiProductPickerProps {
  value: string[];
  onChange: (productIds: string[], products: BrandProduct[]) => void;
  className?: string;
  max?: number;
}

export function MultiProductPicker({ value, onChange, className, max = 3 }: MultiProductPickerProps) {
  const { profiles, isLoading } = useProductProfiles();

  if (isLoading) return null;

  const selected = profiles.filter(p => value.includes(p.id));
  const available = profiles.filter(p => !value.includes(p.id));

  const addProduct = (id: string) => {
    if (value.length >= max) return;
    const newIds = [...value, id];
    onChange(newIds, profiles.filter(p => newIds.includes(p.id)));
  };

  const removeProduct = (id: string) => {
    const newIds = value.filter(v => v !== id);
    onChange(newIds, profiles.filter(p => newIds.includes(p.id)));
  };

  const moveProduct = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= value.length) return;
    const newIds = [...value];
    const [moved] = newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, moved);
    onChange(newIds, profiles.filter(p => newIds.includes(p.id)));
  };

  if (profiles.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-xs font-medium text-muted-foreground">
        Sản phẩm ({selected.length}/{max})
      </label>

      {selected.length > 0 && (
        <div className="space-y-1.5">
          {selected.map((p, idx) => {
            const refsCount = Array.isArray(p.reference_images) ? p.reference_images.length : 0;
            const roleLabel = idx === 0 ? 'Sản phẩm chính' : `Phụ ${selected.length > 2 ? idx : ''}`;
            return (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs transition-colors',
                  idx === 0 ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30',
                )}
              >
                {selected.length > 1 && (
                  <div className="flex flex-col -my-0.5">
                    <button
                      onClick={() => moveProduct(idx, idx - 1)}
                      disabled={idx === 0}
                      className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-20"
                      title="Đưa lên"
                    >
                      <ArrowUp className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={() => moveProduct(idx, idx + 1)}
                      disabled={idx === selected.length - 1}
                      className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-20"
                      title="Đưa xuống"
                    >
                      <ArrowDown className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}

                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                    <Package className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{p.name}</span>
                </div>

                {refsCount > 0 && (
                  <Badge variant="outline" className="text-[9px] h-4 shrink-0">
                    {refsCount}/5 góc
                  </Badge>
                )}

                <Badge
                  variant={idx === 0 ? 'default' : 'outline'}
                  className={cn('text-[9px] h-4 shrink-0', idx === 0 && 'gap-0.5')}
                >
                  {idx === 0 && <Star className="w-2 h-2" />}
                  {roleLabel}
                </Badge>

                <button
                  onClick={() => removeProduct(p.id)}
                  className="shrink-0 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {value.length < max && available.length > 0 && (
        <Select onValueChange={addProduct}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="+ Thêm sản phẩm..." />
          </SelectTrigger>
          <SelectContent>
            {available.map(p => (
              <SelectItem key={p.id} value={p.id}>
                <div className="flex items-center gap-2">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="w-4 h-4 rounded-sm object-cover" />
                  ) : (
                    <Package className="w-3 h-3 text-muted-foreground" />
                  )}
                  <span>{p.name}</span>
                  {p.category && <span className="text-[10px] text-muted-foreground">· {p.category}</span>}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
