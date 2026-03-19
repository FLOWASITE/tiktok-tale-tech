import { useState } from 'react';
import { Package, Star, Tag, Users, Zap, MessageSquare, Hash, Share2, Plus, ChevronDown, ChevronUp, Sparkles, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import { useProductPersonaMappings } from '@/hooks/useProductPersonaMappings';
import { useCustomerPersonas } from '@/hooks/useCustomerPersonas';
import { useOrganization } from '@/hooks/useOrganization';
import { PRODUCT_CATEGORIES, CONTENT_ANGLES, BEST_CHANNELS } from '@/types/product';
import type { BrandProduct } from '@/types/product';
import { BrandTemplate } from '@/hooks/useBrandTemplates';
import { cn } from '@/lib/utils';
import { ProductQuickAddDialog } from './ProductQuickAddDialog';

interface BrandViewProductsTabProps {
  template: BrandTemplate;
}

// Product Card with compact mode and persona badges
interface ProductCardProps {
  product: BrandProduct;
  linkedPersonas: Array<{
    id: string;
    name: string;
    avatar_emoji: string | null;
    relevance_score: number;
    is_primary_product: boolean;
  }>;
  index: number;
  onEdit: (product: BrandProduct) => void;
  onDelete: (productId: string) => void;
  onToggleFeatured: (productId: string, isFeatured: boolean) => void;
}

function ProductCard({ product, linkedPersonas, index, onEdit, onDelete, onToggleFeatured }: ProductCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const categoryLabel = PRODUCT_CATEGORIES.find(c => c.value === product.category)?.label || product.category;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card 
        className={cn(
          "relative overflow-hidden transition-all duration-300 hover:shadow-lg group animate-in fade-in-50 slide-in-from-bottom-2",
          product.is_featured && "ring-2 ring-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-transparent"
        )}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* Featured Badge */}
        {product.is_featured && (
          <div className="absolute top-0 right-0">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs font-medium px-2 py-0.5 rounded-bl-md flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              Nổi bật
            </div>
          </div>
        )}

        {/* Action Buttons - visible on hover */}
        <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          style={product.is_featured ? { top: '1.75rem' } : undefined}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); onToggleFeatured(product.id, !product.is_featured); }}
              >
                <Star className={cn("w-3.5 h-3.5", product.is_featured && "fill-yellow-500 text-yellow-500")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{product.is_featured ? 'Bỏ nổi bật' : 'Đánh dấu nổi bật'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); onEdit(product); }}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Chỉnh sửa</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Xóa sản phẩm</TooltipContent>
          </Tooltip>
        </div>

        <CardContent className="p-4">
          {/* Compact Header */}
          <div className="flex items-start gap-3">
            {/* Product Icon */}
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
              product.is_featured 
                ? "bg-yellow-500/15" 
                : "bg-muted"
            )}>
              <Package className={cn(
                "w-5 h-5",
                product.is_featured ? "text-yellow-600" : "text-muted-foreground"
              )} />
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold truncate">{product.name}</h4>
              </div>
              
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                {categoryLabel && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                    {categoryLabel}
                  </Badge>
                )}
                {product.price_display && (
                  <span className="font-medium text-foreground">{product.price_display}</span>
                )}
              </div>

              {/* USP Highlights */}
              {product.unique_selling_points && product.unique_selling_points.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {product.unique_selling_points.slice(0, 2).map((usp, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px] h-5 gap-1">
                      <Zap className="w-2.5 h-2.5" />
                      {usp}
                    </Badge>
                  ))}
                  {product.unique_selling_points.length > 2 && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      +{product.unique_selling_points.length - 2}
                    </Badge>
                  )}
                </div>
              )}

              {/* Linked Personas Avatar Stack */}
              {linkedPersonas.length > 0 && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className="flex items-center -space-x-2">
                    {linkedPersonas.slice(0, 4).map((persona) => (
                      <div
                        key={persona.id}
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs ring-2 ring-background transition-transform hover:scale-110 hover:z-10",
                          persona.is_primary_product 
                            ? "bg-purple-500/20 ring-purple-500/30" 
                            : "bg-muted"
                        )}
                        title={`${persona.name} (${persona.relevance_score}%)`}
                      >
                        {persona.avatar_emoji || '👤'}
                      </div>
                    ))}
                    {linkedPersonas.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium ring-2 ring-background">
                        +{linkedPersonas.length - 4}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {linkedPersonas.length} persona{linkedPersonas.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Expandable Details */}
          <CollapsibleContent className="space-y-3 mt-4 pt-4 border-t animate-in fade-in-50 slide-in-from-top-2">
            {/* Description */}
            {product.description && (
              <p className="text-sm text-muted-foreground">
                {product.description}
              </p>
            )}

            {/* Target Audience */}
            {product.target_audience && (
              <div className="flex items-start gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{product.target_audience}</span>
              </div>
            )}

            {/* Pain Points */}
            {product.pain_points_solved && product.pain_points_solved.length > 0 && (
              <div>
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
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  Lợi ích
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {product.benefits.map((benefit, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                      {benefit}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            {product.keywords && product.keywords.length > 0 && (
              <div>
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
              <div>
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

            {/* Persona Mappings Detail */}
            {linkedPersonas.length > 0 && (
              <div className="pt-3 border-t">
                <div className="flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Personas đã liên kết
                </div>
                <div className="space-y-1.5">
                  {linkedPersonas.map((persona) => (
                    <div 
                      key={persona.id}
                      className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                    >
                      <span className="text-lg">{persona.avatar_emoji || '👤'}</span>
                      <span className="text-sm flex-1 truncate">{persona.name}</span>
                      {persona.is_primary_product && (
                        <Badge className="text-[9px] h-4 px-1.5 bg-purple-500">Main</Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] font-mono",
                          persona.relevance_score >= 80 && "border-emerald-500/50 text-emerald-600",
                          persona.relevance_score >= 60 && persona.relevance_score < 80 && "border-amber-500/50 text-amber-600",
                          persona.relevance_score < 60 && "border-muted-foreground/50"
                        )}
                      >
                        {persona.relevance_score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>

          {/* Expand Toggle */}
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full h-7 text-xs text-muted-foreground hover:text-foreground mt-3"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 mr-1" />
                  Thu gọn
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 mr-1" />
                  Xem chi tiết
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </CardContent>
      </Card>
    </Collapsible>
  );
}

// Skeleton for loading state
const ProductCardSkeleton = () => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex gap-1 mt-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Empty state with animation
const EmptyState = ({ onAddClick }: { onAddClick: () => void }) => (
  <Card className="border-dashed">
    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center animate-pulse">
          <Package className="w-8 h-8 text-primary" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center animate-bounce" style={{ animationDelay: '0.1s' }}>
          <Sparkles className="w-3 h-3 text-yellow-600" />
        </div>
      </div>
      <h3 className="text-lg font-medium mb-2">Chưa có Sản phẩm/Dịch vụ</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        Thêm sản phẩm để AI có thể tạo nội dung chính xác hơn, với USP và messaging phù hợp.
      </p>
      <Button 
        onClick={onAddClick}
        className="gap-2 animate-bounce"
        style={{ animationDuration: '2s' }}
      >
        <Plus className="w-4 h-4" />
        Thêm sản phẩm đầu tiên
      </Button>
    </CardContent>
  </Card>
);

export function BrandViewProductsTab({ template }: BrandViewProductsTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<BrandProduct | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const { currentOrganization } = useOrganization();
  const { products, isLoading: productsLoading, refetch, deleteProduct, toggleFeatured } = useProductCatalog(template.id);
  const { mappings, isLoading: mappingsLoading } = useProductPersonaMappings({
    brandTemplateId: template.id,
    enabled: true,
  });
  const { personas, isLoading: personasLoading } = useCustomerPersonas({
    brandTemplateId: template.id,
    enabled: true,
  });

  const isLoading = productsLoading || mappingsLoading || personasLoading;

  // Get linked personas for each product
  const getLinkedPersonas = (productId: string) => {
    const productMappings = mappings.filter(m => m.product_id === productId);
    return productMappings.map(mapping => {
      const persona = personas.find(p => p.id === mapping.persona_id);
      return {
        id: mapping.persona_id,
        name: persona?.name || 'Unknown',
        avatar_emoji: persona?.avatar_emoji || null,
        relevance_score: mapping.relevance_score,
        is_primary_product: mapping.is_primary_product,
      };
    }).sort((a, b) => {
      if (a.is_primary_product && !b.is_primary_product) return -1;
      if (!a.is_primary_product && b.is_primary_product) return 1;
      return b.relevance_score - a.relevance_score;
    });
  };

  const handleEdit = (product: BrandProduct) => {
    setEditingProduct(product);
  };

  const handleDeleteConfirm = async () => {
    if (deleteProductId) {
      await deleteProduct(deleteProductId);
      setDeleteProductId(null);
    }
  };

  const handleToggleFeatured = async (productId: string, isFeatured: boolean) => {
    await toggleFeatured(productId, isFeatured);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <>
        <EmptyState onAddClick={() => setShowAddDialog(true)} />
        <ProductQuickAddDialog
          brandTemplateId={template.id}
          organizationId={currentOrganization?.id}
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onSuccess={() => refetch()}
        />
      </>
    );
  }

  const featuredProducts = products.filter(p => p.is_featured);
  const regularProducts = products.filter(p => !p.is_featured);

  return (
    <div className="space-y-4">
      {/* Summary Header with Quick Add */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <span className="font-medium">{products.length} Sản phẩm/Dịch vụ</span>
        </div>
        <div className="flex items-center gap-2">
          {featuredProducts.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              {featuredProducts.length} nổi bật
            </Badge>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowAddDialog(true)}
                className="gap-1 hover:scale-105 transition-transform"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Thêm</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Thêm sản phẩm mới</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-500">
            <Star className="w-4 h-4 fill-current" />
            Sản phẩm nổi bật
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredProducts.map((product, idx) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                linkedPersonas={getLinkedPersonas(product.id)}
                index={idx}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteProductId(id)}
                onToggleFeatured={handleToggleFeatured}
              />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {regularProducts.map((product, idx) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                linkedPersonas={getLinkedPersonas(product.id)}
                index={featuredProducts.length + idx}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteProductId(id)}
                onToggleFeatured={handleToggleFeatured}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick Add / Edit Dialog */}
      <ProductQuickAddDialog
        brandTemplateId={template.id}
        organizationId={currentOrganization?.id}
        open={showAddDialog || !!editingProduct}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingProduct(null);
          }
        }}
        onSuccess={() => refetch()}
        editProduct={editingProduct}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProductId} onOpenChange={(open) => !open && setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa sản phẩm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa sản phẩm này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
