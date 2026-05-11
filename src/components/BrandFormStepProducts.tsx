import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Package,
  Plus,
  Trash2,
  Star,
  Edit,
  ChevronDown,
  ChevronUp,
  Users,
  Sparkles,
  X,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocalProduct } from '@/components/brand/ProductCatalogEditor';
import { CustomerPersona } from '@/types/customerPersona';
import { PRODUCT_CATEGORIES, CONTENT_ANGLES, BEST_CHANNELS } from '@/types/product';
import { LocalProductPersonaLinker, LocalProductPersonaMapping } from '@/components/brand/LocalProductPersonaLinker';
import { SuggestProductsFromWebsiteDialog } from '@/components/brand/SuggestProductsFromWebsiteDialog';

interface BrandFormStepProductsProps {
  brandTemplateId?: string | null;
  localProducts: LocalProduct[];
  onLocalProductsChange: (products: LocalProduct[]) => void;
  personas: CustomerPersona[];
  brandName?: string;
  localMappings: LocalProductPersonaMapping[];
  onLocalMappingsChange: (mappings: LocalProductPersonaMapping[]) => void;
  websiteUrl?: string;
}

const defaultProductData: Omit<LocalProduct, 'id'> = {
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

export function BrandFormStepProducts({
  brandTemplateId,
  localProducts,
  onLocalProductsChange,
  personas,
  brandName,
  localMappings,
  onLocalMappingsChange,
  websiteUrl,
}: BrandFormStepProductsProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LocalProduct | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<LocalProduct, 'id'>>(defaultProductData);
  const [newItem, setNewItem] = useState('');
  const [activeArrayField, setActiveArrayField] = useState<string | null>(null);
  const [showSuggestDialog, setShowSuggestDialog] = useState(false);

  const handleAddProduct = () => {
    if (!formData.name.trim()) return;
    
    const newProduct: LocalProduct = {
      id: `temp-${Date.now()}`,
      ...formData,
    };
    
    onLocalProductsChange([...localProducts, newProduct]);
    setFormData(defaultProductData);
    setShowAddDialog(false);
  };

  const handleUpdateProduct = () => {
    if (!editingProduct || !formData.name.trim()) return;
    
    onLocalProductsChange(
      localProducts.map(p => 
        p.id === editingProduct.id ? { ...p, ...formData } : p
      )
    );
    setEditingProduct(null);
    setFormData(defaultProductData);
  };

  const handleDeleteProduct = (id: string) => {
    onLocalProductsChange(localProducts.filter(p => p.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const handleToggleFeatured = (id: string) => {
    onLocalProductsChange(
      localProducts.map(p => 
        p.id === id ? { ...p, is_featured: !p.is_featured } : p
      )
    );
  };

  const openEditDialog = (product: LocalProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      description: product.description,
      price_display: product.price_display,
      image_url: product.image_url,
      unique_selling_points: product.unique_selling_points,
      target_audience: product.target_audience,
      pain_points_solved: product.pain_points_solved,
      benefits: product.benefits,
      keywords: product.keywords,
      suggested_content_angles: product.suggested_content_angles,
      best_channels: product.best_channels,
      is_featured: product.is_featured,
      is_active: product.is_active,
    });
  };

  const addArrayItem = (field: keyof typeof formData) => {
    if (!newItem.trim()) return;
    const currentArray = (formData[field] as string[]) || [];
    if (!currentArray.includes(newItem.trim())) {
      setFormData({
        ...formData,
        [field]: [...currentArray, newItem.trim()],
      });
    }
    setNewItem('');
  };

  const removeArrayItem = (field: keyof typeof formData, value: string) => {
    const currentArray = (formData[field] as string[]) || [];
    setFormData({
      ...formData,
      [field]: currentArray.filter(v => v !== value),
    });
  };

  const toggleArrayItem = (field: keyof typeof formData, value: string) => {
    const currentArray = (formData[field] as string[]) || [];
    if (currentArray.includes(value)) {
      setFormData({
        ...formData,
        [field]: currentArray.filter(v => v !== value),
      });
    } else {
      setFormData({
        ...formData,
        [field]: [...currentArray, value],
      });
    }
  };

  const renderProductForm = () => (
    <ScrollArea className="max-h-[60vh]">
      <div className="space-y-4 pr-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs">Tên sản phẩm *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Khóa học Content Creator Pro"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">SKU</Label>
            <Input
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="VD: CCP-001"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Danh mục</Label>
            <Select
              value={formData.category}
              onValueChange={(v) => setFormData({ ...formData, category: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Chọn danh mục" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs">Mô tả</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Mô tả ngắn gọn về sản phẩm..."
            className="mt-1"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Giá hiển thị</Label>
            <Input
              value={formData.price_display}
              onChange={(e) => setFormData({ ...formData, price_display: e.target.value })}
              placeholder="VD: 2.500.000đ"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Đối tượng mục tiêu</Label>
            <Input
              value={formData.target_audience}
              onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
              placeholder="VD: Sinh viên, người mới bắt đầu"
              className="mt-1"
            />
          </div>
        </div>

        {/* USPs */}
        <div>
          <Label className="text-xs flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Điểm bán hàng độc đáo (USP)
          </Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={activeArrayField === 'unique_selling_points' ? newItem : ''}
              onChange={(e) => {
                setActiveArrayField('unique_selling_points');
                setNewItem(e.target.value);
              }}
              onFocus={() => setActiveArrayField('unique_selling_points')}
              placeholder="Thêm USP..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addArrayItem('unique_selling_points');
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addArrayItem('unique_selling_points')}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {formData.unique_selling_points.map((usp, i) => (
              <Badge key={i} variant="secondary" className="text-xs gap-1">
                {usp}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeArrayItem('unique_selling_points', usp)}
                />
              </Badge>
            ))}
          </div>
        </div>

        {/* Pain Points Solved */}
        <div>
          <Label className="text-xs">Vấn đề giải quyết</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={activeArrayField === 'pain_points_solved' ? newItem : ''}
              onChange={(e) => {
                setActiveArrayField('pain_points_solved');
                setNewItem(e.target.value);
              }}
              onFocus={() => setActiveArrayField('pain_points_solved')}
              placeholder="Thêm vấn đề..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addArrayItem('pain_points_solved');
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addArrayItem('pain_points_solved')}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {formData.pain_points_solved.map((pp, i) => (
              <Badge key={i} variant="outline" className="text-xs gap-1">
                {pp}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeArrayItem('pain_points_solved', pp)}
                />
              </Badge>
            ))}
          </div>
        </div>

        {/* Content Angles */}
        <div>
          <Label className="text-xs">Góc tiếp cận content</Label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {CONTENT_ANGLES.map(angle => (
              <Badge
                key={angle.value}
                variant={formData.suggested_content_angles.includes(angle.value) ? "default" : "outline"}
                className="text-xs cursor-pointer"
                onClick={() => toggleArrayItem('suggested_content_angles', angle.value)}
              >
                {angle.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Best Channels */}
        <div>
          <Label className="text-xs">Kênh phù hợp nhất</Label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {BEST_CHANNELS.map(channel => (
              <Badge
                key={channel.value}
                variant={formData.best_channels.includes(channel.value) ? "default" : "outline"}
                className="text-xs cursor-pointer"
                onClick={() => toggleArrayItem('best_channels', channel.value)}
              >
                {channel.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Featured Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-sm">Sản phẩm nổi bật</span>
          </div>
          <Switch
            checked={formData.is_featured}
            onCheckedChange={(v) => setFormData({ ...formData, is_featured: v })}
          />
        </div>
      </div>
    </ScrollArea>
  );

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Package className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Sản phẩm & Dịch vụ</h2>
          <p className="text-sm text-muted-foreground">
            Thêm sản phẩm để AI tạo content phù hợp với từng mặt hàng
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSuggestDialog(true)}
          className="gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Gợi ý từ Website
        </Button>
        <Badge variant="outline" className="text-xs">
          {localProducts.length}/10
        </Badge>
      </div>

      <SuggestProductsFromWebsiteDialog
        open={showSuggestDialog}
        onOpenChange={setShowSuggestDialog}
        defaultUrl={websiteUrl}
        existingProductNames={localProducts.map((p) => p.name)}
        onAddProducts={(picked) => {
          const remaining = Math.max(0, 10 - localProducts.length);
          const toAdd = picked.slice(0, remaining);
          onLocalProductsChange([...localProducts, ...toAdd]);
        }}
      />

      {/* Import banner: highlight pre-suggested products from initial website scan */}
      {localProducts.some((p) => p.id.startsWith('temp-import-')) && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm animate-fade-in">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="font-medium">
              {localProducts.filter((p) => p.id.startsWith('temp-import-')).length} sản phẩm tự động từ website
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI đã trích xuất từ lượt nhập website ban đầu. Hãy chỉnh sửa hoặc xoá nếu chưa phù hợp.
            </p>
          </div>
        </div>
      )}

      {/* Tip Banner - Only show if has personas but no products */}
      {personas.length > 0 && localProducts.length === 0 && (
        <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20 animate-fade-in">
          <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-medium">Bạn đã có {personas.length} personas!</span>
            <p className="text-muted-foreground mt-0.5">
              Thêm sản phẩm và liên kết với personas để AI hiểu rõ hơn về đối tượng mục tiêu cho từng sản phẩm.
            </p>
          </div>
        </div>
      )}

      {/* Products List */}
      {localProducts.length > 0 ? (
        <div className="space-y-3">
          {localProducts.map((product, index) => (
            <Card 
              key={product.id} 
              className={cn(
                "overflow-hidden transition-all stagger-item",
                product.is_featured && "ring-1 ring-amber-500/30 bg-amber-500/5"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {product.name}
                        </span>
                        {product.is_featured && (
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                        )}
                        {product.category && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                            {PRODUCT_CATEGORIES.find(c => c.value === product.category)?.label || product.category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {product.price_display && (
                          <span className="font-medium text-foreground">{product.price_display}</span>
                        )}
                        {product.unique_selling_points.length > 0 && (
                          <span>• {product.unique_selling_points.length} USP</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Quick Link Personas Button */}
                    {(() => {
                      const linkedPersonasCount = localMappings.filter(m => m.product_id === product.id).length;
                      return (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-7 w-7 relative",
                                linkedPersonasCount > 0 && "text-primary"
                              )}
                              title="Liên kết Personas"
                            >
                              <Users className="w-3.5 h-3.5" />
                              {linkedPersonasCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
                                  {linkedPersonasCount}
                                </span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-3" align="end">
                            <LocalProductPersonaLinker
                              mode="product"
                              productId={product.id}
                              products={localProducts}
                              personas={personas}
                              mappings={localMappings}
                              onMappingsChange={onLocalMappingsChange}
                            />
                          </PopoverContent>
                        </Popover>
                      );
                    })()}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleToggleFeatured(product.id)}
                    >
                      <Star className={cn(
                        "w-3.5 h-3.5",
                        product.is_featured ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                      )} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(product)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setExpandedId(expandedId === product.id ? null : product.id)}
                    >
                      {expandedId === product.id ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedId === product.id && (
                  <div className="mt-3 pt-3 border-t space-y-2 animate-fade-in">
                    {product.description && (
                      <p className="text-sm text-muted-foreground">{product.description}</p>
                    )}
                    {product.unique_selling_points.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {product.unique_selling_points.map((usp, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            <Sparkles className="w-2.5 h-2.5 mr-1" />
                            {usp}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {product.suggested_content_angles.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {product.suggested_content_angles.map((angle, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {CONTENT_ANGLES.find(a => a.value === angle)?.label || angle}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Product-Persona Linker */}
                    <LocalProductPersonaLinker
                      mode="product"
                      productId={product.id}
                      products={localProducts}
                      personas={personas}
                      mappings={localMappings}
                      onMappingsChange={onLocalMappingsChange}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Add More Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 border-dashed gap-2"
            onClick={() => {
              setFormData(defaultProductData);
              setShowAddDialog(true);
            }}
            disabled={localProducts.length >= 10}
          >
            <Plus className="w-4 h-4" />
            Thêm sản phẩm
          </Button>
        </div>
      ) : (
        /* Empty State */
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="relative inline-block mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-float">
                <Package className="w-8 h-8 text-primary" />
              </div>
              <Sparkles className="w-5 h-5 text-primary absolute -top-1 -right-1 animate-bounce-subtle" />
            </div>
            <h3 className="font-medium text-lg mb-1">Chưa có sản phẩm nào</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
              Thêm sản phẩm để AI tạo content phù hợp với từng mặt hàng và đối tượng khách hàng
            </p>
            <Button
              type="button"
              onClick={() => {
                setFormData(defaultProductData);
                setShowAddDialog(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Thêm sản phẩm đầu tiên
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Thêm sản phẩm mới
            </DialogTitle>
          </DialogHeader>
          {renderProductForm()}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setShowAddDialog(false)}>
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleAddProduct}
              disabled={!formData.name.trim()}
            >
              Thêm sản phẩm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Chỉnh sửa sản phẩm
            </DialogTitle>
          </DialogHeader>
          {renderProductForm()}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditingProduct(null)}>
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleUpdateProduct}
              disabled={!formData.name.trim()}
            >
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
