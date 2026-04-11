import { useState } from 'react';
import { Package, Star, ChevronDown, Plus, Zap, Users, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import { BrandProduct, PRODUCT_CATEGORIES } from '@/types/product';
import { cn } from '@/lib/utils';

interface ProductSelectorProps {
  brandTemplateId?: string;
  value?: string;
  onValueChange?: (productId: string | undefined, product?: BrandProduct) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showAddButton?: boolean;
  onAddProduct?: () => void;
}

export function ProductSelector({
  brandTemplateId,
  value,
  onValueChange,
  placeholder = 'Chọn sản phẩm...',
  disabled = false,
  className,
  showAddButton = true,
  onAddProduct,
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const { products, isLoading } = useProductCatalog(brandTemplateId);

  const selectedProduct = products.find(p => p.id === value);

  const handleSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      onValueChange?.(productId, product);
    }
    setOpen(false);
  };

  const handleClear = () => {
    onValueChange?.(undefined);
    setOpen(false);
  };

  if (!brandTemplateId) {
    return (
      <Button variant="outline" disabled className={cn("w-full justify-between", className)}>
        <span className="text-muted-foreground">Chọn brand trước</span>
      </Button>
    );
  }

  const renderProductPreview = (product: BrandProduct) => (
    <div className="mt-1.5 space-y-1.5 border-t border-border/40 pt-1.5">
      {/* USP badges */}
      {product.unique_selling_points && product.unique_selling_points.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <Zap className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
          {product.unique_selling_points.slice(0, 3).map((usp, idx) => (
            <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
              {usp}
            </Badge>
          ))}
          {product.unique_selling_points.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{product.unique_selling_points.length - 3}</span>
          )}
        </div>
      )}
      {/* Target audience */}
      {product.target_audience && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Users className="h-3 w-3 shrink-0" />
          <span className="truncate">{product.target_audience}</span>
        </div>
      )}
      {/* Benefits count */}
      {product.benefits && product.benefits.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Heart className="h-3 w-3 shrink-0" />
          <span>{product.benefits.length} lợi ích</span>
        </div>
      )}
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn("w-full justify-between", className)}
        >
          {selectedProduct ? (
            <div className="flex items-center gap-2 truncate">
              {selectedProduct.is_featured && (
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
              )}
              <Package className="h-4 w-4 shrink-0" />
              <span className="truncate">{selectedProduct.name}</span>
              {selectedProduct.unique_selling_points?.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 shrink-0">
                  {selectedProduct.unique_selling_points.length} USP
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{isLoading ? 'Đang tải...' : placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Tìm sản phẩm..." />
          <CommandList>
            <CommandEmpty>
              {products.length === 0 ? (
                <div className="py-4 text-center text-sm">
                  <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Chưa có sản phẩm nào</p>
                  {showAddButton && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="mt-1"
                      onClick={() => { onAddProduct?.(); setOpen(false); }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Thêm sản phẩm
                    </Button>
                  )}
                </div>
              ) : (
                'Không tìm thấy sản phẩm'
              )}
            </CommandEmpty>

            {/* Featured products first */}
            {products.filter(p => p.is_featured).length > 0 && (
              <CommandGroup heading="Sản phẩm nổi bật">
                {products.filter(p => p.is_featured).map(product => (
                  <CommandItem
                    key={product.id}
                    value={product.name}
                    onSelect={() => handleSelect(product.id)}
                    className="flex flex-col items-start gap-0 py-2"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                      <span className="flex-1 truncate">{product.name}</span>
                      {product.category && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {PRODUCT_CATEGORIES.find(c => c.value === product.category)?.label || product.category}
                        </Badge>
                      )}
                    </div>
                    {renderProductPreview(product)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Other products */}
            {products.filter(p => !p.is_featured).length > 0 && (
              <CommandGroup heading="Tất cả sản phẩm">
                {products.filter(p => !p.is_featured).map(product => (
                  <CommandItem
                    key={product.id}
                    value={product.name}
                    onSelect={() => handleSelect(product.id)}
                    className="flex flex-col items-start gap-0 py-2"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{product.name}</span>
                      {product.category && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {PRODUCT_CATEGORIES.find(c => c.value === product.category)?.label || product.category}
                        </Badge>
                      )}
                    </div>
                    {renderProductPreview(product)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {value && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={handleClear} className="text-muted-foreground justify-center">
                    Bỏ chọn
                  </CommandItem>
                </CommandGroup>
              </>
            )}

            {showAddButton && products.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem 
                    onSelect={() => { onAddProduct?.(); setOpen(false); }}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm sản phẩm mới
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
