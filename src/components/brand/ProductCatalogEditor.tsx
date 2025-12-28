import { useState } from 'react';
import { Plus, Package, Star, Pencil, Trash2, ChevronDown, ChevronUp, X, Tag, Users, Zap, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import { 
  BrandProduct, 
  ProductFormData, 
  PRODUCT_CATEGORIES, 
  CONTENT_ANGLES, 
  BEST_CHANNELS 
} from '@/types/product';
import { cn } from '@/lib/utils';

// Local product type for temp products (no db fields)
export interface LocalProduct extends ProductFormData {
  id: string;
}

interface ProductCatalogEditorProps {
  brandTemplateId?: string;
  className?: string;
  // For local mode (new brand, not yet saved)
  localProducts?: LocalProduct[];
  onLocalProductsChange?: (products: LocalProduct[]) => void;
}

const defaultFormData: ProductFormData = {
  name: '',
  sku: '',
  category: '',
  description: '',
  price_display: '',
  image_url: '',
  unique_selling_points: [],
  target_audience: '',
  pain_points_solved: [],
  benefits: [],
  keywords: [],
  suggested_content_angles: [],
  best_channels: [],
  is_featured: false,
  is_active: true,
};

export function ProductCatalogEditor({ 
  brandTemplateId, 
  className,
  localProducts,
  onLocalProductsChange,
}: ProductCatalogEditorProps) {
  // Use local mode if brandTemplateId is not available but localProducts handlers are provided
  const isLocalMode = !brandTemplateId && !!onLocalProductsChange;
  
  const { products: dbProducts, isLoading, isSubmitting, createProduct, updateProduct, deleteProduct, toggleFeatured } = useProductCatalog(brandTemplateId);
  
  // Determine which products to display
  const products = isLocalMode ? (localProducts || []) : dbProducts;
  
  const [isOpen, setIsOpen] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<BrandProduct | LocalProduct | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [newItem, setNewItem] = useState('');
  const [activeArrayField, setActiveArrayField] = useState<keyof ProductFormData | null>(null);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (product: BrandProduct | LocalProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || '',
      category: product.category || '',
      description: product.description || '',
      price_display: product.price_display || '',
      image_url: product.image_url || '',
      unique_selling_points: product.unique_selling_points || [],
      target_audience: product.target_audience || '',
      pain_points_solved: product.pain_points_solved || [],
      benefits: product.benefits || [],
      keywords: product.keywords || [],
      suggested_content_angles: product.suggested_content_angles || [],
      best_channels: product.best_channels || [],
      is_featured: product.is_featured,
      is_active: product.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (isLocalMode && onLocalProductsChange) {
      // Local mode: update local state
      if (editingProduct) {
        const updatedProducts = (localProducts || []).map(p => 
          p.id === editingProduct.id ? { ...p, ...formData } : p
        );
        onLocalProductsChange(updatedProducts);
      } else {
        const newProduct: LocalProduct = {
          ...formData,
          id: `temp-${Date.now()}`,
        };
        onLocalProductsChange([...(localProducts || []), newProduct]);
      }
      setDialogOpen(false);
      return;
    }

    // Database mode
    let result;
    if (editingProduct && 'brand_template_id' in editingProduct) {
      result = await updateProduct(editingProduct.id, formData);
    } else {
      result = await createProduct(formData);
    }
    
    // Only close dialog on success
    if (result) {
      setDialogOpen(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
      if (isLocalMode && onLocalProductsChange) {
        const updatedProducts = (localProducts || []).filter(p => p.id !== productId);
        onLocalProductsChange(updatedProducts);
      } else {
        await deleteProduct(productId);
      }
    }
  };

  const handleToggleFeatured = async (productId: string, isFeatured: boolean) => {
    if (isLocalMode && onLocalProductsChange) {
      const updatedProducts = (localProducts || []).map(p => 
        p.id === productId ? { ...p, is_featured: isFeatured } : p
      );
      onLocalProductsChange(updatedProducts);
    } else {
      await toggleFeatured(productId, isFeatured);
    }
  };

  const addArrayItem = (field: keyof ProductFormData) => {
    if (!newItem.trim()) return;
    const currentArray = formData[field] as string[];
    if (!currentArray.includes(newItem.trim())) {
      setFormData(prev => ({
        ...prev,
        [field]: [...currentArray, newItem.trim()]
      }));
    }
    setNewItem('');
  };

  const removeArrayItem = (field: keyof ProductFormData, item: string) => {
    const currentArray = formData[field] as string[];
    setFormData(prev => ({
      ...prev,
      [field]: currentArray.filter(i => i !== item)
    }));
  };

  const toggleArrayItem = (field: keyof ProductFormData, value: string) => {
    const currentArray = formData[field] as string[];
    if (currentArray.includes(value)) {
      setFormData(prev => ({
        ...prev,
        [field]: currentArray.filter(i => i !== value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: [...currentArray, value]
      }));
    }
  };

  // Show nothing if not in local mode and no brandTemplateId
  if (!brandTemplateId && !isLocalMode) {
    return (
      <div className={cn("rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center text-muted-foreground text-sm", className)}>
        Lưu brand template trước để thêm sản phẩm
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" className="flex items-center gap-2 p-0 h-auto hover:bg-transparent">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-medium">Sản phẩm/Dịch vụ</span>
              <Badge variant="secondary" className="ml-1">{products.length}</Badge>
              {isLocalMode && <Badge variant="outline" className="ml-1 text-[10px]">Tạm</Badge>}
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <Button type="button" variant="outline" size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Thêm
          </Button>
        </div>

        <CollapsibleContent className="pt-3 space-y-2">
          {isLoading && !isLocalMode ? (
            <div className="text-sm text-muted-foreground">Đang tải...</div>
          ) : products.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
              Chưa có sản phẩm nào. Thêm sản phẩm để AI gợi ý content phù hợp.
            </div>
          ) : (
            <div className="space-y-2">
              {products.map(product => (
                <div 
                  key={product.id} 
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {product.is_featured && (
                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                      )}
                      <span className="font-medium truncate">{product.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {product.category && (
                        <span>{PRODUCT_CATEGORIES.find(c => c.value === product.category)?.label || product.category}</span>
                      )}
                      {product.price_display && (
                        <>
                          <span>•</span>
                          <span>{product.price_display}</span>
                        </>
                      )}
                    </div>
                    {product.unique_selling_points && product.unique_selling_points.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {product.unique_selling_points.slice(0, 2).map((usp, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {usp}
                          </Badge>
                        ))}
                        {product.unique_selling_points.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{product.unique_selling_points.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleToggleFeatured(product.id, !product.is_featured)}
                      title={product.is_featured ? 'Bỏ nổi bật' : 'Đánh dấu nổi bật'}
                    >
                      <Star className={cn("h-4 w-4", product.is_featured ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground")} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleOpenEdit(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Product Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</DialogTitle>
            <DialogDescription>
              Thêm thông tin sản phẩm để AI gợi ý content phù hợp
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="name">Tên sản phẩm *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Áo thun Organic Cotton"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="sku">Mã SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={e => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="SKU-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Danh mục</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={v => setFormData(prev => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="price">Giá hiển thị</Label>
                  <Input
                    id="price"
                    value={formData.price_display}
                    onChange={e => setFormData(prev => ({ ...prev, price_display: e.target.value }))}
                    placeholder="350.000đ, Liên hệ..."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Mô tả ngắn</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả ngắn gọn về sản phẩm..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="target_audience">Đối tượng khách hàng</Label>
                <Input
                  id="target_audience"
                  value={formData.target_audience}
                  onChange={e => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                  placeholder="Ví dụ: Chủ doanh nghiệp nhỏ, Sinh viên..."
                />
              </div>

              {/* USP */}
              <div>
                <Label className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Điểm bán hàng độc đáo (USP)
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={activeArrayField === 'unique_selling_points' ? newItem : ''}
                    onChange={e => { setNewItem(e.target.value); setActiveArrayField('unique_selling_points'); }}
                    onFocus={() => setActiveArrayField('unique_selling_points')}
                    placeholder="Giao hàng 2h, Bảo hành 12 tháng..."
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('unique_selling_points'))}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('unique_selling_points')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.unique_selling_points.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.unique_selling_points.map((item, idx) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                        {item}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={() => removeArrayItem('unique_selling_points', item)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Pain Points */}
              <div>
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Vấn đề sản phẩm giải quyết
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={activeArrayField === 'pain_points_solved' ? newItem : ''}
                    onChange={e => { setNewItem(e.target.value); setActiveArrayField('pain_points_solved'); }}
                    onFocus={() => setActiveArrayField('pain_points_solved')}
                    placeholder="Tiết kiệm thời gian, Giảm chi phí..."
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('pain_points_solved'))}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('pain_points_solved')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.pain_points_solved.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.pain_points_solved.map((item, idx) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                        {item}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={() => removeArrayItem('pain_points_solved', item)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Benefits */}
              <div>
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Lợi ích khách hàng nhận được
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={activeArrayField === 'benefits' ? newItem : ''}
                    onChange={e => { setNewItem(e.target.value); setActiveArrayField('benefits'); }}
                    onFocus={() => setActiveArrayField('benefits')}
                    placeholder="Tăng doanh thu, Mở rộng thị trường..."
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('benefits'))}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('benefits')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.benefits.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.benefits.map((item, idx) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                        {item}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={() => removeArrayItem('benefits', item)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Keywords */}
              <div>
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Từ khóa SEO
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={activeArrayField === 'keywords' ? newItem : ''}
                    onChange={e => { setNewItem(e.target.value); setActiveArrayField('keywords'); }}
                    onFocus={() => setActiveArrayField('keywords')}
                    placeholder="áo thun nam, thời trang eco..."
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('keywords'))}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('keywords')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.keywords.map((item, idx) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                        {item}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={() => removeArrayItem('keywords', item)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Content Angles */}
              <div>
                <Label>Góc độ content phù hợp</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {CONTENT_ANGLES.map(angle => (
                    <Badge 
                      key={angle.value}
                      variant={formData.suggested_content_angles.includes(angle.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('suggested_content_angles', angle.value)}
                    >
                      {angle.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Best Channels */}
              <div>
                <Label>Kênh phù hợp nhất</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {BEST_CHANNELS.map(channel => (
                    <Badge 
                      key={channel.value}
                      variant={formData.best_channels.includes(channel.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('best_channels', channel.value)}
                    >
                      {channel.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Featured Switch */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <Label htmlFor="is_featured">Sản phẩm nổi bật</Label>
                </div>
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={v => setFormData(prev => ({ ...prev, is_featured: v }))}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              type="button" 
              onClick={handleSubmit}
              disabled={!formData.name.trim() || isSubmitting}
            >
              {isSubmitting ? 'Đang lưu...' : (editingProduct ? 'Cập nhật' : 'Thêm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
