import { useEffect } from 'react';
import { User, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MultiProductPicker } from '@/components/products/MultiProductPicker';
import { useCharacterProductMap } from '@/hooks/useCharacterProductMap';
import type { CharacterProfile } from '@/hooks/useCharacterProfiles';
import type { BrandProduct } from '@/types/product';

interface CharacterProductMapProps {
  characters: CharacterProfile[];
  /** Báo về parent: union các productIds đã gán cho mọi character đang chọn. */
  onUnionChange: (productIds: string[]) => void;
  className?: string;
}

/**
 * UI gán Sản phẩm cho từng Nhân vật trong session Video Studio.
 * Hiện dưới MultiCharacterPicker khi đã chọn ≥1 nhân vật.
 * Lưu sessionStorage qua useCharacterProductMap. Không ghi DB.
 */
export function CharacterProductMap({ characters, onUnionChange, className }: CharacterProductMapProps) {
  const { map, setForCharacter, unionProductIds } = useCharacterProductMap();

  const characterIds = characters.map((c) => c.id);

  // Mỗi lần map hoặc list character đổi → emit union ra parent
  useEffect(() => {
    onUnionChange(unionProductIds(characterIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, characterIds.join(',')]);

  if (characters.length === 0) return null;

  return (
    <div className={cn('rounded-md border border-border/60 bg-muted/20 p-2.5 space-y-2', className)}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Link2 className="w-3 h-3" />
        Sản phẩm theo từng nhân vật
        <span className="text-[10px] text-muted-foreground/70">(chỉ trong phiên này)</span>
      </div>

      <div className="space-y-2.5">
        {characters.map((c) => {
          const value = map[c.id] ?? [];
          return (
            <div key={c.id} className="rounded border border-border/40 bg-background/60 p-2">
              <div className="flex items-center gap-2 mb-1.5">
                {c.reference_image_url ? (
                  <img src={c.reference_image_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
                <span className="text-xs font-medium truncate">{c.name}</span>
                {value.length > 0 && (
                  <span className="ml-auto text-[10px] text-muted-foreground">{value.length} sản phẩm</span>
                )}
              </div>
              <MultiProductPicker
                value={value}
                onChange={(ids: string[], _products: BrandProduct[]) => setForCharacter(c.id, ids)}
                max={3}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
