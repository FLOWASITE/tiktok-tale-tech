import { Package, Sparkles, Percent, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductPersonaMappings } from '@/hooks/useProductPersonaMappings';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import { cn } from '@/lib/utils';

interface PersonaProductsListProps {
  brandTemplateId: string;
  personaId: string;
  organizationId?: string;
  className?: string;
  compact?: boolean;
}

export function PersonaProductsList({
  brandTemplateId,
  personaId,
  organizationId,
  className,
  compact = false,
}: PersonaProductsListProps) {
  const { products, isLoading: productsLoading } = useProductCatalog(brandTemplateId);
  const { mappings, isLoading: mappingsLoading, getProductsForPersona } = useProductPersonaMappings({
    brandTemplateId,
    personaId,
    organizationId,
    enabled: !!brandTemplateId && !!personaId,
  });

  const isLoading = productsLoading || mappingsLoading;
  const personaMappings = getProductsForPersona(personaId);
  
  // Sort by relevance and primary status
  const sortedMappings = [...personaMappings].sort((a, b) => {
    if (a.is_primary_product && !b.is_primary_product) return -1;
    if (!a.is_primary_product && b.is_primary_product) return 1;
    return b.relevance_score - a.relevance_score;
  });

  // Get product details for each mapping
  const linkedProducts = sortedMappings.map(mapping => {
    const product = products.find(p => p.id === mapping.product_id);
    return { ...mapping, product };
  }).filter(m => m.product);

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {compact ? (
          <div className="flex gap-1">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        ) : (
          <>
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </>
        )}
      </div>
    );
  }

  if (linkedProducts.length === 0) {
    return (
      <div className={cn(
        "text-xs text-muted-foreground italic",
        !compact && "p-3 rounded-lg border border-dashed text-center",
        className
      )}>
        {compact ? (
          <span>Chưa liên kết sản phẩm</span>
        ) : (
          <>
            <Package className="w-4 h-4 inline-block mr-1.5 opacity-50" />
            Chưa có sản phẩm nào được liên kết với persona này
          </>
        )}
      </div>
    );
  }

  // Compact mode: Just show badges
  if (compact) {
    return (
      <div className={cn("flex flex-wrap gap-1", className)}>
        {linkedProducts.slice(0, 4).map(item => (
          <Badge
            key={item.id}
            variant="outline"
            className={cn(
              "text-[10px] h-5 gap-1 transition-all duration-200",
              item.is_primary_product 
                ? "border-purple-500/50 bg-purple-500/10 text-purple-600 hover:bg-purple-500/20" 
                : "border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-accent"
            )}
          >
            {item.is_primary_product && <Sparkles className="w-2.5 h-2.5" />}
            <Package className="w-2.5 h-2.5" />
            <span className="max-w-[80px] truncate">{item.product?.name}</span>
            <span className={cn(
              "font-mono text-[9px] font-medium",
              item.relevance_score >= 80 && "text-emerald-600",
              item.relevance_score >= 60 && item.relevance_score < 80 && "text-amber-600",
              item.relevance_score < 60 && "text-muted-foreground",
            )}>
              {item.relevance_score}%
            </span>
          </Badge>
        ))}
        {linkedProducts.length > 4 && (
          <Badge variant="secondary" className="text-[10px] h-5">
            +{linkedProducts.length - 4} more
          </Badge>
        )}
      </div>
    );
  }

  // Full mode: Show detailed cards
  return (
    <div className={cn("space-y-2", className)}>
      {linkedProducts.map((item, idx) => (
        <div
          key={item.id}
          className={cn(
            "flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-200 animate-in fade-in-50",
            item.is_primary_product 
              ? "border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10" 
              : "border-border bg-card hover:bg-accent/5 hover:border-muted-foreground/30"
          )}
          style={{ animationDelay: `${idx * 50}ms` }}
        >
          {/* Product Icon */}
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
            item.is_primary_product 
              ? "bg-purple-500/15" 
              : "bg-muted"
          )}>
            <Package className={cn(
              "w-4 h-4",
              item.is_primary_product ? "text-purple-500" : "text-muted-foreground"
            )} />
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm truncate">
                {item.product?.name}
              </span>
              {item.is_primary_product && (
                <Badge className="text-[9px] h-4 px-1.5 bg-purple-500 hover:bg-purple-600 shrink-0">
                  <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                  Main
                </Badge>
              )}
            </div>
            
            {/* Custom Pitch */}
            {item.custom_pitch && (
              <div className="flex items-start gap-1 mt-1">
                <MessageSquare className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                  "{item.custom_pitch}"
                </p>
              </div>
            )}
            
            {/* Key Benefits */}
            {item.key_benefits && item.key_benefits.length > 0 && (
              <div className="flex flex-wrap gap-0.5 mt-1.5">
                {item.key_benefits.slice(0, 2).map((benefit, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    className="text-[9px] h-4 bg-emerald-500/10 text-emerald-600 border-0"
                  >
                    {benefit}
                  </Badge>
                ))}
                {item.key_benefits.length > 2 && (
                  <Badge variant="secondary" className="text-[9px] h-4">
                    +{item.key_benefits.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Relevance Score */}
          <Badge
            variant="outline"
            className={cn(
              "text-xs gap-1 shrink-0 font-mono",
              item.relevance_score >= 80 && "border-emerald-500/50 text-emerald-600 bg-emerald-500/5",
              item.relevance_score >= 60 && item.relevance_score < 80 && "border-amber-500/50 text-amber-600 bg-amber-500/5",
              item.relevance_score < 60 && "border-muted-foreground/50 text-muted-foreground",
            )}
          >
            <Percent className="w-3 h-3" />
            {item.relevance_score}
          </Badge>
        </div>
      ))}
    </div>
  );
}
