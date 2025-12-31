import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Star, Package, Users, Link2, Plus, X, Lightbulb, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomerPersona } from '@/types/customerPersona';
import { LocalProduct } from '@/components/brand/ProductCatalogEditor';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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
  const [popoverOpen, setPopoverOpen] = useState(false);

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
      <div className={cn(
        "mt-4 p-4 rounded-xl",
        "bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5",
        "border-2 border-dashed border-primary/20",
        className
      )}>
        <div className="flex flex-col items-center justify-center py-2 text-center">
          <div className="p-2.5 rounded-full bg-primary/10 mb-2">
            {mode === 'product' ? (
              <Users className="w-5 h-5 text-primary" />
            ) : (
              <Package className="w-5 h-5 text-primary" />
            )}
          </div>
          <p className="text-sm font-medium text-foreground">
            {mode === 'product' 
              ? 'Thêm Personas ở Step 2 để liên kết'
              : 'Thêm Sản phẩm ở Step 3 để liên kết'
            }
          </p>
        </div>
      </div>
    );
  }

  const items = mode === 'product' ? personas : products;
  const unlinkedItems = items.filter(item => !isLinked(item.id));

  return (
    <div className={cn(
      "mt-4 p-4 rounded-xl transition-all duration-300",
      "bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5",
      linkedCount > 0 
        ? "border-2 border-primary/30 shadow-md shadow-primary/5" 
        : "border-2 border-dashed border-primary/20 hover:border-primary/40",
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Link2 className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-primary">
          {mode === 'product' ? '🔗 Liên kết Personas' : '🔗 Liên kết Sản phẩm'}
        </span>
        {linkedCount > 0 && (
          <Badge className={cn(
            "bg-primary/20 text-primary border-0 font-semibold",
            "animate-pulse"
          )}>
            {linkedCount}/{totalItems}
          </Badge>
        )}
        {linkedCount > 0 && (
          <Sparkles className="w-4 h-4 text-amber-500 ml-auto animate-pulse" />
        )}
      </div>

      {/* Hint text */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30 mb-3">
        <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {mode === 'product' 
            ? 'Liên kết với personas để AI tạo nội dung phù hợp từng đối tượng khách hàng'
            : 'Liên kết sản phẩm để AI hiểu persona này quan tâm đến sản phẩm nào'
          }
        </p>
      </div>

      {/* Empty state */}
      {linkedCount === 0 && (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="p-3 rounded-full bg-muted/50 mb-2">
            {mode === 'product' ? (
              <Users className="w-6 h-6 text-muted-foreground" />
            ) : (
              <Package className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Chưa có {mode === 'product' ? 'persona' : 'sản phẩm'} nào được liên kết
          </p>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                <Plus className="w-4 h-4" />
                Thêm liên kết đầu tiên
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="center">
              <div className="p-2 border-b bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground">
                  Chọn {mode === 'product' ? 'persona' : 'sản phẩm'} để liên kết
                </p>
              </div>
              <div className="max-h-[250px] overflow-y-auto p-2 space-y-1">
                {items.map(item => {
                  const linked = isLinked(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors",
                        linked 
                          ? "bg-primary/10 border border-primary/20" 
                          : "hover:bg-muted"
                      )}
                      onClick={() => handleToggleLink(item.id)}
                    >
                      <Checkbox checked={linked} className="pointer-events-none" />
                      {mode === 'product' ? (
                        <span className="text-lg">{(item as CustomerPersona).avatar_emoji}</span>
                      ) : (
                        <Package className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-sm truncate flex-1">{item.name}</span>
                      {linked && <Badge variant="secondary" className="text-[10px]">Đã liên kết</Badge>}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Linked items as chips */}
      {linkedCount > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {relevantMappings.map(mapping => {
              const item = mode === 'product'
                ? personas.find(p => p.id === mapping.persona_id)
                : products.find(p => p.id === mapping.product_id);
              if (!item) return null;
              
              const itemId = mode === 'product' ? mapping.persona_id : mapping.product_id;
              
              return (
                <div 
                  key={mapping.product_id + mapping.persona_id}
                  className={cn(
                    "group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-full",
                    "bg-background shadow-sm border border-border/50",
                    "hover:shadow-md hover:border-primary/30 transition-all duration-200",
                    "animate-scale-in"
                  )}
                >
                  {mode === 'product' ? (
                    <span className="text-base">{(item as CustomerPersona).avatar_emoji}</span>
                  ) : (
                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium truncate max-w-[100px]">{item.name}</span>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "h-5 text-[10px] px-1.5 font-semibold",
                      mapping.relevance_score >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                      mapping.relevance_score >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                      "bg-muted text-muted-foreground"
                    )}
                  >
                    {mapping.relevance_score}%
                  </Badge>
                  {mapping.is_primary_product && (
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  )}
                  <button
                    type="button"
                    className="p-0.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
                    onClick={() => handleToggleLink(itemId)}
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              );
            })}
            
            {/* Add more button */}
            {unlinkedItems.length > 0 && (
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                      "border-2 border-dashed border-primary/30",
                      "text-primary hover:bg-primary/5 hover:border-primary/50",
                      "transition-all duration-200"
                    )}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Thêm</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <div className="p-2 border-b bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground">
                      Chọn {mode === 'product' ? 'persona' : 'sản phẩm'} để liên kết
                    </p>
                  </div>
                  <div className="max-h-[250px] overflow-y-auto p-2 space-y-1">
                    {items.map(item => {
                      const linked = isLinked(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={cn(
                            "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors",
                            linked 
                              ? "bg-primary/10 border border-primary/20" 
                              : "hover:bg-muted"
                          )}
                          onClick={() => handleToggleLink(item.id)}
                        >
                          <Checkbox checked={linked} className="pointer-events-none" />
                          {mode === 'product' ? (
                            <span className="text-lg">{(item as CustomerPersona).avatar_emoji}</span>
                          ) : (
                            <Package className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-sm truncate flex-1">{item.name}</span>
                          {linked && <Badge variant="secondary" className="text-[10px]">Đã liên kết</Badge>}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Detailed editor for linked items */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground font-medium">Điều chỉnh mức độ phù hợp:</p>
            {relevantMappings.map(mapping => {
              const item = mode === 'product'
                ? personas.find(p => p.id === mapping.persona_id)
                : products.find(p => p.id === mapping.product_id);
              if (!item) return null;
              
              const itemId = mode === 'product' ? mapping.persona_id : mapping.product_id;
              
              return (
                <div 
                  key={mapping.product_id + mapping.persona_id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-1.5 min-w-[100px]">
                    {mode === 'product' ? (
                      <span className="text-sm">{(item as CustomerPersona).avatar_emoji}</span>
                    ) : (
                      <Package className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span className="text-xs truncate">{item.name}</span>
                  </div>
                  <Slider
                    value={[mapping.relevance_score]}
                    onValueChange={([v]) => handleRelevanceChange(itemId, v)}
                    max={100}
                    min={0}
                    step={5}
                    className="flex-1"
                  />
                  <span className={cn(
                    "text-xs font-semibold w-9 text-right",
                    mapping.relevance_score >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                    mapping.relevance_score >= 50 ? "text-amber-600 dark:text-amber-400" : 
                    "text-muted-foreground"
                  )}>
                    {mapping.relevance_score}%
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleTogglePrimary(itemId)}
                    title={mapping.is_primary_product ? "Bỏ sản phẩm chính" : "Đặt làm sản phẩm chính"}
                  >
                    <Star className={cn(
                      "w-4 h-4 transition-colors",
                      mapping.is_primary_product 
                        ? "fill-amber-400 text-amber-400" 
                        : "text-muted-foreground hover:text-amber-400"
                    )} />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
