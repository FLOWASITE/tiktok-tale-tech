import { useState, useEffect } from 'react';
import { Plus, X, Zap, MessageSquare, Tag, Hash, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import { ProductFormData, BrandProduct, PRODUCT_CATEGORIES, CONTENT_ANGLES, BEST_CHANNELS } from '@/types/product';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ProductQuickAddDialogProps {
  brandTemplateId: string;
  organizationId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editProduct?: BrandProduct | null;
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

function productToFormData(product: BrandProduct): ProductFormData {
  return {
    name: product.name || '',
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
    is_featured: product.is_featured || false,
    is_active: product.is_active !== false,
  };
}

export function ProductQuickAddDialog({
  brandTemplateId,
  open,
  onOpenChange,
  onSuccess,
  editProduct,
}: ProductQuickAddDialogProps) {
  const { createProduct, updateProduct, isSubmitting } = useProductCatalog(brandTemplateId);
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [newItem, setNewItem] = useState('');
  const [activeArrayField, setActiveArrayField] = useState<keyof ProductFormData | null>(null);

  const isEditMode = !!editProduct;

  // Pre-fill form when editing
  useEffect(() => {
    if (editProduct && open) {
      setFormData(productToFormData(editProduct));
    } else if (!open) {
      setFormData(defaultFormData);
    }
  }, [editProduct, open]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng nhập tên sản phẩm', variant: 'destructive' });
      return;
    }

    if (isEditMode && editProduct) {
      const result = await updateProduct(editProduct.id, formData);
      if (result) {
        toast({ title: 'Thành công', description: 'Đã cập nhật sản phẩm' });
        setFormData(defaultFormData);
        onOpenChange(false);
        onSuccess?.();
      }
    } else {
      const result = await createProduct(formData);
      if (result) {
        toast({ title: 'Thành công', description: 'Đã thêm sản phẩm mới' });
        setFormData(defaultFormData);
        onOpenChange(false);
        onSuccess?.();
      }
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

  const handleClose = () => {
    setFormData(defaultFormData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Cập nhật thông tin sản phẩm' : 'Thêm thông tin sản phẩm để AI gợi ý content phù hợp'}
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
                  autoFocus
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
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1 bg-destructive/10 text-destructive border-destructive/20">
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
                <Tag className="h-4 w-4" />
                Lợi ích chính
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={activeArrayField === 'benefits' ? newItem : ''}
                  onChange={e => { setNewItem(e.target.value); setActiveArrayField('benefits'); }}
                  onFocus={() => setActiveArrayField('benefits')}
                  placeholder="Tăng hiệu quả, An toàn hơn..."
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('benefits'))}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('benefits')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.benefits.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.benefits.map((item, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
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
                <Hash className="h-4 w-4" />
                Từ khóa SEO
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={activeArrayField === 'keywords' ? newItem : ''}
                  onChange={e => { setNewItem(e.target.value); setActiveArrayField('keywords'); }}
                  onFocus={() => setActiveArrayField('keywords')}
                  placeholder="áo thun cotton, thời trang bền vững..."
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('keywords'))}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('keywords')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.keywords.map((item, idx) => (
                    <Badge key={idx} variant="outline" className="flex items-center gap-1 font-mono text-xs">
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
              <Label>Góc khai thác content</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CONTENT_ANGLES.map(angle => (
                  <Badge
                    key={angle.value}
                    variant={formData.suggested_content_angles.includes(angle.value) ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer transition-all hover:scale-105",
                      formData.suggested_content_angles.includes(angle.value) && "bg-primary"
                    )}
                    onClick={() => toggleArrayItem('suggested_content_angles', angle.value)}
                  >
                    {angle.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Best Channels */}
            <div>
              <Label className="flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Kênh phù hợp nhất
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {BEST_CHANNELS.map(channel => (
                  <Badge
                    key={channel.value}
                    variant={formData.best_channels.includes(channel.value) ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer transition-all hover:scale-105",
                      formData.best_channels.includes(channel.value) && "bg-primary"
                    )}
                    onClick={() => toggleArrayItem('best_channels', channel.value)}
                  >
                    {channel.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Featured Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div>
                <Label htmlFor="featured" className="text-sm font-medium">Sản phẩm nổi bật</Label>
                <p className="text-xs text-muted-foreground">Ưu tiên hiển thị trong AI suggestions</p>
              </div>
              <Switch
                id="featured"
                checked={formData.is_featured}
                onCheckedChange={v => setFormData(prev => ({ ...prev, is_featured: v }))}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name.trim()}>
            {isSubmitting 
              ? (isEditMode ? 'Đang cập nhật...' : 'Đang thêm...') 
              : (isEditMode ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
