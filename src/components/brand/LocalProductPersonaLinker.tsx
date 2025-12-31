import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Star, Package, Users, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomerPersona } from '@/types/customerPersona';
import { LocalProduct } from '@/components/brand/ProductCatalogEditor';

export interface LocalProductPersonaMapping {
  product_id: string;
  persona_id: string;
  relevance_score: number;
  is_primary_product: boolean;
}

interface LocalProductPersonaLinkerProps {
  mode: 'product' | 'persona';
  productId?: string;
  personaId?: string;
  products: LocalProduct[];
  personas: CustomerPersona[];
  mappings: LocalProductPersonaMapping[];
  onMappingsChange: (mappings: LocalProductPersonaMapping[]) => void;
  className?: string;
}

export function LocalProductPersonaLinker({
  mode,
  productId,
  personaId,
  products,
  personas,
  mappings,
  onMappingsChange,
  className,
}: LocalProductPersonaLinkerProps) {
  const [expanded, setExpanded] = useState(false);

  // Get mappings for the current item
  const relevantMappings = mode === 'product'
    ? mappings.filter(m => m.product_id === productId)
    : mappings.filter(m => m.persona_id === personaId);

  const linkedCount = relevantMappings.length;
  const totalItems = mode === 'product' ? personas.length : products.length;

  const handleToggleLink = (itemId: string) => {
    const targetProductId = mode === 'product' ? productId! : itemId;
    const targetPersonaId = mode === 'product' ? itemId : personaId!;
    
    const existingMapping = mappings.find(
      m => m.product_id === targetProductId && m.persona_id === targetPersonaId
    );

    if (existingMapping) {
      // Remove mapping
      onMappingsChange(mappings.filter(
        m => !(m.product_id === targetProductId && m.persona_id === targetPersonaId)
      ));
    } else {
      // Add mapping
      onMappingsChange([
        ...mappings,
        {
          product_id: targetProductId,
          persona_id: targetPersonaId,
          relevance_score: 80,
          is_primary_product: false,
        },
      ]);
    }
  };

  const handleRelevanceChange = (itemId: string, score: number) => {
    const targetProductId = mode === 'product' ? productId! : itemId;
    const targetPersonaId = mode === 'product' ? itemId : personaId!;
    
    onMappingsChange(mappings.map(m => {
      if (m.product_id === targetProductId && m.persona_id === targetPersonaId) {
        return { ...m, relevance_score: score };
      }
      return m;
    }));
  };

  const handleTogglePrimary = (itemId: string) => {
    const targetProductId = mode === 'product' ? productId! : itemId;
    const targetPersonaId = mode === 'product' ? itemId : personaId!;
    
    onMappingsChange(mappings.map(m => {
      if (m.product_id === targetProductId && m.persona_id === targetPersonaId) {
        return { ...m, is_primary_product: !m.is_primary_product };
      }
      return m;
    }));
  };

  const isLinked = (itemId: string) => {
    const targetProductId = mode === 'product' ? productId! : itemId;
    const targetPersonaId = mode === 'product' ? itemId : personaId!;
    return mappings.some(m => m.product_id === targetProductId && m.persona_id === targetPersonaId);
  };

  const getMapping = (itemId: string) => {
    const targetProductId = mode === 'product' ? productId! : itemId;
    const targetPersonaId = mode === 'product' ? itemId : personaId!;
    return mappings.find(m => m.product_id === targetProductId && m.persona_id === targetPersonaId);
  };

  if (totalItems === 0) {
    return (
      <div className={cn("p-3 bg-muted/30 rounded-lg text-center", className)}>
        <p className="text-xs text-muted-foreground">
          {mode === 'product' 
            ? 'Thêm Personas ở Step 2 để liên kết'
            : 'Thêm Sản phẩm ở Step 3 để liên kết'
          }
        </p>
      </div>
    );
  }

  const items = mode === 'product' ? personas : products;

  return (
    <div className={cn("border-t pt-3 mt-3 space-y-2", className)}>
      <button
        type="button"
        className="flex items-center justify-between w-full text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {mode === 'product' ? (
            <Users className="w-4 h-4 text-primary" />
          ) : (
            <Package className="w-4 h-4 text-primary" />
          )}
          <span className="text-sm font-medium">
            {mode === 'product' ? 'Personas phù hợp' : 'Sản phẩm phù hợp'}
          </span>
          {linkedCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {linkedCount}/{totalItems}
            </Badge>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {!expanded && linkedCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {relevantMappings.slice(0, 3).map(mapping => {
            const item = mode === 'product'
              ? personas.find(p => p.id === mapping.persona_id)
              : products.find(p => p.id === mapping.product_id);
            if (!item) return null;
            
            return (
              <Badge key={mapping.product_id + mapping.persona_id} variant="outline" className="text-[10px] gap-1">
                {mode === 'product' ? (item as CustomerPersona).avatar_emoji : <Package className="w-2.5 h-2.5" />}
                <span className="truncate max-w-[80px]">{item.name}</span>
                <span className="text-muted-foreground">{mapping.relevance_score}%</span>
                {mapping.is_primary_product && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />}
              </Badge>
            );
          })}
          {linkedCount > 3 && (
            <Badge variant="outline" className="text-[10px]">
              +{linkedCount - 3}
            </Badge>
          )}
        </div>
      )}

      {expanded && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-xs text-muted-foreground">
            <Link2 className="w-3 h-3 inline mr-1" />
            {mode === 'product' 
              ? 'Liên kết sản phẩm với personas để AI tạo content phù hợp'
              : 'Liên kết persona với sản phẩm để AI hiểu rõ đối tượng'
            }
          </p>
          
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {items.map(item => {
              const linked = isLinked(item.id);
              const mapping = getMapping(item.id);
              
              return (
                <div 
                  key={item.id}
                  className={cn(
                    "p-2 rounded-lg border transition-colors",
                    linked ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={linked}
                      onCheckedChange={() => handleToggleLink(item.id)}
                    />
                    
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {mode === 'product' ? (
                        <span className="text-lg">{(item as CustomerPersona).avatar_emoji}</span>
                      ) : (
                        <Package className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-sm truncate">{item.name}</span>
                      {mode === 'persona' && (item as LocalProduct).is_featured && (
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      )}
                    </div>

                    {linked && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleTogglePrimary(item.id)}
                        title={mapping?.is_primary_product ? "Bỏ sản phẩm chính" : "Đặt làm sản phẩm chính"}
                      >
                        <Star className={cn(
                          "w-3.5 h-3.5",
                          mapping?.is_primary_product ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                        )} />
                      </Button>
                    )}
                  </div>

                  {linked && (
                    <div className="flex items-center gap-2 mt-2 pl-6">
                      <span className="text-[10px] text-muted-foreground w-16">Phù hợp:</span>
                      <Slider
                        value={[mapping?.relevance_score || 80]}
                        onValueChange={([v]) => handleRelevanceChange(item.id, v)}
                        max={100}
                        min={0}
                        step={5}
                        className="flex-1"
                      />
                      <span className={cn(
                        "text-xs font-medium w-10 text-right",
                        (mapping?.relevance_score || 80) >= 80 ? "text-emerald-600" :
                        (mapping?.relevance_score || 80) >= 50 ? "text-amber-600" : "text-muted-foreground"
                      )}>
                        {mapping?.relevance_score || 80}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
