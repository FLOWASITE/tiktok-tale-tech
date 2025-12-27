import { useState } from 'react';
import { Package, Star, ChevronDown, Plus, Search } from 'lucide-react';
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
            </div>
          ) : (
            <span className="text-muted-foreground">{isLoading ? 'Đang tải...' : placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
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
                    className="flex items-center gap-2"
                  >
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="flex-1 truncate">{product.name}</span>
                    {product.category && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {PRODUCT_CATEGORIES.find(c => c.value === product.category)?.label || product.category}
                      </Badge>
                    )}
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
                    className="flex items-center gap-2"
                  >
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{product.name}</span>
                    {product.category && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {PRODUCT_CATEGORIES.find(c => c.value === product.category)?.label || product.category}
                      </Badge>
                    )}
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
