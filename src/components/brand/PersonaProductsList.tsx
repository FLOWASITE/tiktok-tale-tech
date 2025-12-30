import { Package, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  const { products } = useProductCatalog(brandTemplateId);
  const { getProductsForPersona } = useProductPersonaMappings({
    brandTemplateId,
    personaId,
    organizationId,
    enabled: !!brandTemplateId && !!personaId,
  });

  const personaMappings = getProductsForPersona(personaId);
  
  if (personaMappings.length === 0) {
    return null;
  }

  // Sort by relevance and primary status
  const sortedMappings = [...personaMappings].sort((a, b) => {
    if (a.is_primary_product && !b.is_primary_product) return -1;
    if (!a.is_primary_product && b.is_primary_product) return 1;
    return b.relevance_score - a.relevance_score;
  });

  if (compact) {
    return (
      <div className={cn("flex flex-wrap gap-1", className)}>
        {sortedMappings.slice(0, 3).map(mapping => {
          const product = products.find(p => p.id === mapping.product_id);
          if (!product) return null;
          
          return (
            <Badge 
              key={mapping.id}
              variant={mapping.is_primary_product ? "default" : "secondary"}
              className="text-xs"
            >
              {mapping.is_primary_product && <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />}
              {product.name}
            </Badge>
          );
        })}
        {sortedMappings.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{sortedMappings.length - 3}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Package className="h-4 w-4 text-primary" />
        <span>Sản phẩm phù hợp</span>
        <Badge variant="secondary" className="text-xs">{personaMappings.length}</Badge>
      </div>
      
      <div className="space-y-1.5">
        {sortedMappings.map(mapping => {
          const product = products.find(p => p.id === mapping.product_id);
          if (!product) return null;
          
          return (
            <div 
              key={mapping.id}
              className={cn(
                "flex items-center justify-between p-2 rounded-md border bg-card/50",
                mapping.is_primary_product && "border-primary/30 bg-primary/5"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {mapping.is_primary_product && (
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                )}
                <span className="text-sm truncate">{product.name}</span>
              </div>
              <Badge 
                variant={mapping.relevance_score >= 80 ? "default" : "secondary"}
                className="text-xs shrink-0"
              >
                {mapping.relevance_score}%
              </Badge>
            </div>
          );
        })}
      </div>

      {sortedMappings.some(m => m.custom_pitch) && (
        <div className="pt-2 border-t">
          {sortedMappings.filter(m => m.custom_pitch).map(mapping => {
            const product = products.find(p => p.id === mapping.product_id);
            return (
              <div key={mapping.id} className="text-xs text-muted-foreground italic">
                <span className="font-medium">{product?.name}:</span> "{mapping.custom_pitch}"
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
