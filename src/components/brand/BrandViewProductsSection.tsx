import { Package, Star, Tag, Users, Zap, MessageSquare, Hash, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import { PRODUCT_CATEGORIES, CONTENT_ANGLES, BEST_CHANNELS } from '@/types/product';
import { Skeleton } from '@/components/ui/skeleton';

interface BrandViewProductsSectionProps {
  brandTemplateId: string;
}

export function BrandViewProductsSection({ brandTemplateId }: BrandViewProductsSectionProps) {
  const { products, isLoading } = useProductCatalog(brandTemplateId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Sản phẩm/Dịch vụ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!products || products.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Sản phẩm/Dịch vụ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic text-center py-4">
            Chưa có sản phẩm/dịch vụ nào được thêm.
          </p>
        </CardContent>
      </Card>
    );
  }

  const featuredProducts = products.filter(p => p.is_featured);
  const regularProducts = products.filter(p => !p.is_featured);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          Sản phẩm/Dịch vụ
          <Badge variant="secondary" className="ml-auto">{products.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-500">
              <Star className="w-4 h-4 fill-current" />
              Sản phẩm nổi bật
            </div>
            <div className="grid gap-3">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} featured />
              ))}
            </div>
          </div>
        )}

        {/* Regular Products */}
        {regularProducts.length > 0 && (
          <div className="space-y-3">
            {featuredProducts.length > 0 && (
              <div className="text-sm font-medium text-muted-foreground">
                Sản phẩm khác
              </div>
            )}
            <div className="grid gap-3">
              {regularProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    category: string | null;
    description: string | null;
    price_display: string | null;
    target_audience: string | null;
    unique_selling_points: string[];
    pain_points_solved: string[];
    benefits: string[];
    keywords: string[];
    suggested_content_angles: string[];
    best_channels: string[];
    is_featured: boolean;
  };
  featured?: boolean;
}

function ProductCard({ product, featured }: ProductCardProps) {
  const categoryLabel = PRODUCT_CATEGORIES.find(c => c.value === product.category)?.label || product.category;
  
  return (
    <div 
      className={`p-4 rounded-lg border transition-colors ${
        featured 
          ? 'border-yellow-500/30 bg-yellow-500/5' 
          : 'border-border bg-card hover:bg-accent/5'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {featured && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />}
            <h4 className="font-medium truncate">{product.name}</h4>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {categoryLabel && <span>{categoryLabel}</span>}
            {product.price_display && (
              <>
                <span>•</span>
                <span className="font-medium text-foreground">{product.price_display}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {product.description}
        </p>
      )}

      {/* Target Audience */}
      {product.target_audience && (
        <div className="flex items-start gap-2 mb-3 text-sm">
          <Users className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <span className="text-muted-foreground">{product.target_audience}</span>
        </div>
      )}

      {/* USP */}
      {product.unique_selling_points && product.unique_selling_points.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
            <Zap className="w-3.5 h-3.5" />
            Điểm nổi bật (USP)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {product.unique_selling_points.map((usp, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {usp}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Pain Points */}
      {product.pain_points_solved && product.pain_points_solved.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Vấn đề giải quyết
          </div>
          <div className="flex flex-wrap gap-1.5">
            {product.pain_points_solved.map((point, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {point}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Benefits */}
      {product.benefits && product.benefits.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
            <Tag className="w-3.5 h-3.5" />
            Lợi ích
          </div>
          <div className="flex flex-wrap gap-1.5">
            {product.benefits.map((benefit, idx) => (
              <Badge key={idx} variant="outline" className="text-xs bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400">
                {benefit}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Keywords */}
      {product.keywords && product.keywords.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
            <Hash className="w-3.5 h-3.5" />
            Từ khóa SEO
          </div>
          <div className="flex flex-wrap gap-1.5">
            {product.keywords.map((keyword, idx) => (
              <Badge key={idx} variant="outline" className="text-xs font-mono">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Content Angles */}
      {product.suggested_content_angles && product.suggested_content_angles.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
            Góc khai thác content
          </div>
          <div className="flex flex-wrap gap-1.5">
            {product.suggested_content_angles.map((angle, idx) => {
              const label = CONTENT_ANGLES.find(a => a.value === angle)?.label || angle;
              return (
                <Badge key={idx} variant="outline" className="text-xs bg-primary/10 border-primary/30">
                  {label}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Best Channels */}
      {product.best_channels && product.best_channels.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
            <Share2 className="w-3.5 h-3.5" />
            Kênh phù hợp
          </div>
          <div className="flex flex-wrap gap-1.5">
            {product.best_channels.map((channel, idx) => {
              const label = BEST_CHANNELS.find(c => c.value === channel)?.label || channel;
              return (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {label}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
