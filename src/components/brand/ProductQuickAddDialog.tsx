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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import { useProductImageActions } from '@/hooks/useProductImageActions';
import { ProductFormData, BrandProduct, PRODUCT_CATEGORIES, CONTENT_ANGLES, BEST_CHANNELS, ProductReferenceImage, ProductAppearance } from '@/types/product';
import { ProductReferenceImagesEditor } from '@/components/products/ProductReferenceImagesEditor';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, Loader2, Upload, Sparkles } from 'lucide-react';

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
  reference_images: [],
  appearance: {},
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
    reference_images: Array.isArray(product.reference_images) ? product.reference_images : [],
    appearance: product.appearance || {},
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
  const [uploadingMain, setUploadingMain] = useState(false);
  const [generatingMain, setGeneratingMain] = useState(false);

  const imageActions = useProductImageActions({
    name: formData.name,
    category: formData.category,
    description: formData.description,
    appearance: formData.appearance,
  });

  const handleUploadMain = async (file: File) => {
    setUploadingMain(true);
    try {
      const url = await imageActions.uploadFile(file);
      if (url) {
        setFormData(prev => ({ ...prev, image_url: url }));
        sonnerToast.success('Đã upload ảnh chính');
      }
    } finally {
      setUploadingMain(false);
    }
  };

  const handleGenerateMain = async () => {
    if (!formData.name.trim()) {
      sonnerToast.error('Nhập tên sản phẩm trước');
      return;
    }
    setGeneratingMain(true);
    try {
      const url = await imageActions.generateImage('front');
      if (url) {
        setFormData(prev => ({ ...prev, image_url: url }));
        sonnerToast.success('Đã tạo ảnh chính bằng AI');
      }
    } finally {
      setGeneratingMain(false);
    }
  };

  const handleAnalyzeMain = async () => {
    if (!formData.image_url) return;
    const result = await imageActions.analyzeImage(formData.image_url);
    if (result?.appearance) {
      setFormData(prev => ({
        ...prev,
        appearance: { ...prev.appearance, ...result.appearance },
      }));
      sonnerToast.success('Đã phân tích & điền đặc điểm');
    }
  };

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
      <DialogContent className="max-w-5xl max-h-[92vh] w-[96vw] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base">{isEditMode ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {isEditMode ? 'Cập nhật thông tin & hình ảnh tham chiếu' : 'Thông tin càng đầy đủ, AI gợi ý content càng chính xác'}
              </DialogDescription>
            </div>
            {formData.is_featured && (
              <Badge variant="secondary" className="text-[10px]">Nổi bật</Badge>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex flex-col flex-1 min-h-0">
          <TabsList className="mx-6 mt-3 grid grid-cols-3 h-9 shrink-0">
            <TabsTrigger value="info" className="text-xs">1. Thông tin & Ảnh</TabsTrigger>
            <TabsTrigger value="marketing" className="text-xs">2. Marketing AI</TabsTrigger>
            <TabsTrigger value="distribution" className="text-xs">3. Phân phối</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 max-h-[62vh] px-6 py-4">
            <TabsContent value="info" className="m-0 space-y-5 data-[state=inactive]:hidden" forceMount>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
                {/* LEFT: Basic info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-xs">Tên sản phẩm *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="VD: Áo thun Organic Cotton"
                      autoFocus
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="sku" className="text-xs">Mã SKU</Label>
                      <Input
                        id="sku"
                        value={formData.sku}
                        onChange={e => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                        placeholder="SKU-001"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price" className="text-xs">Giá hiển thị</Label>
                      <Input
                        id="price"
                        value={formData.price_display}
                        onChange={e => setFormData(prev => ({ ...prev, price_display: e.target.value }))}
                        placeholder="350.000đ"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="category" className="text-xs">Danh mục</Label>
                    <Select
                      value={formData.category}
                      onValueChange={v => setFormData(prev => ({ ...prev, category: v }))}
                    >
                      <SelectTrigger className="mt-1">
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
                    <Label htmlFor="description" className="text-xs">Mô tả ngắn</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Mô tả ngắn gọn về sản phẩm..."
                      rows={3}
                      className="mt-1 resize-none"
                    />
                  </div>

                  <Separator />

                  {/* Appearance */}
                  <div>
                    <Label className="text-xs font-medium">Đặc điểm hình thức</Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">Giúp AI giữ ảnh nhất quán giữa các góc</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        className="h-8 text-xs"
                        value={formData.appearance?.color || ''}
                        onChange={e => setFormData(prev => ({ ...prev, appearance: { ...prev.appearance, color: e.target.value } }))}
                        placeholder="Màu: Trắng ngà"
                      />
                      <Input
                        className="h-8 text-xs"
                        value={formData.appearance?.material || ''}
                        onChange={e => setFormData(prev => ({ ...prev, appearance: { ...prev.appearance, material: e.target.value } }))}
                        placeholder="Chất liệu: Cotton"
                      />
                      <Input
                        className="h-8 text-xs"
                        value={formData.appearance?.size || ''}
                        onChange={e => setFormData(prev => ({ ...prev, appearance: { ...prev.appearance, size: e.target.value } }))}
                        placeholder="Kích thước: 30ml"
                      />
                      <Input
                        className="h-8 text-xs"
                        value={formData.appearance?.distinctive_features || ''}
                        onChange={e => setFormData(prev => ({ ...prev, appearance: { ...prev.appearance, distinctive_features: e.target.value } }))}
                        placeholder="Đặc điểm: Logo vàng"
                      />
                    </div>
                  </div>
                </div>

                {/* RIGHT: Image panel */}
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5" /> Ảnh chính
                      </Label>
                      {formData.image_url && (
                        <button
                          type="button"
                          className="text-[10px] text-destructive hover:underline"
                          onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                        >
                          Xoá
                        </button>
                      )}
                    </div>

                    <div className="aspect-square w-full rounded-md overflow-hidden ring-1 ring-border bg-muted flex items-center justify-center">
                      {formData.image_url ? (
                        <img src={formData.image_url} alt="main" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center px-3">
                          <ImageIcon className="w-8 h-8 text-muted-foreground/50 mx-auto mb-1" />
                          <p className="text-[10px] text-muted-foreground">Chưa có ảnh chính</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <label>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingMain}
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadMain(f);
                            e.target.value = '';
                          }}
                        />
                        <span className="w-full inline-flex items-center justify-center gap-1.5 h-8 px-2 text-xs rounded-md border cursor-pointer hover:bg-muted">
                          {uploadingMain ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          Upload
                        </span>
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 gap-1.5 text-xs"
                        disabled={generatingMain || !formData.name.trim()}
                        onClick={handleGenerateMain}
                      >
                        {generatingMain ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        Tạo AI
                      </Button>
                    </div>

                    {formData.image_url && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="w-full h-7 gap-1.5 text-xs"
                        disabled={imageActions.analyzing}
                        onClick={handleAnalyzeMain}
                      >
                        {imageActions.analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        Phân tích đặc điểm từ ảnh
                      </Button>
                    )}
                  </div>

                  <div className="rounded-lg border p-3">
                    <Label className="text-xs font-medium">Ảnh tham chiếu (đa góc)</Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">Front / Back / In-use / Packaging…</p>
                    <ProductReferenceImagesEditor
                      productName={formData.name}
                      category={formData.category}
                      description={formData.description}
                      appearance={formData.appearance}
                      primaryImageUrl={formData.image_url}
                      referenceImages={formData.reference_images || []}
                      onChange={(next) => setFormData(prev => ({ ...prev, reference_images: next }))}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="marketing" className="m-0 space-y-4 data-[state=inactive]:hidden" forceMount>
              <div>
                <Label htmlFor="target_audience" className="text-xs">Đối tượng khách hàng</Label>
                <Input
                  id="target_audience"
                  value={formData.target_audience}
                  onChange={e => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                  placeholder="VD: Chủ doanh nghiệp nhỏ, Sinh viên..."
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* USP */}
                <div>
                  <Label className="text-xs flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> USP — Điểm bán hàng độc đáo
                  </Label>
                  <div className="flex gap-1.5 mt-1">
                    <Input
                      value={activeArrayField === 'unique_selling_points' ? newItem : ''}
                      onChange={e => { setNewItem(e.target.value); setActiveArrayField('unique_selling_points'); }}
                      onFocus={() => setActiveArrayField('unique_selling_points')}
                      placeholder="Giao 2h, Bảo hành 12 tháng..."
                      className="h-8 text-xs"
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('unique_selling_points'))}
                    />
                    <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => addArrayItem('unique_selling_points')}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {formData.unique_selling_points.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.unique_selling_points.map((item, idx) => (
                        <Badge key={idx} variant="secondary" className="flex items-center gap-1 text-[11px]">
                          {item}
                          <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeArrayItem('unique_selling_points', item)} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pain Points */}
                <div>
                  <Label className="text-xs flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> Vấn đề giải quyết
                  </Label>
                  <div className="flex gap-1.5 mt-1">
                    <Input
                      value={activeArrayField === 'pain_points_solved' ? newItem : ''}
                      onChange={e => { setNewItem(e.target.value); setActiveArrayField('pain_points_solved'); }}
                      onFocus={() => setActiveArrayField('pain_points_solved')}
                      placeholder="Tiết kiệm thời gian..."
                      className="h-8 text-xs"
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('pain_points_solved'))}
                    />
                    <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => addArrayItem('pain_points_solved')}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {formData.pain_points_solved.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.pain_points_solved.map((item, idx) => (
                        <Badge key={idx} variant="secondary" className="flex items-center gap-1 text-[11px] bg-destructive/10 text-destructive border-destructive/20">
                          {item}
                          <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeArrayItem('pain_points_solved', item)} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Benefits */}
                <div>
                  <Label className="text-xs flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Lợi ích chính
                  </Label>
                  <div className="flex gap-1.5 mt-1">
                    <Input
                      value={activeArrayField === 'benefits' ? newItem : ''}
                      onChange={e => { setNewItem(e.target.value); setActiveArrayField('benefits'); }}
                      onFocus={() => setActiveArrayField('benefits')}
                      placeholder="Tăng hiệu quả, An toàn..."
                      className="h-8 text-xs"
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('benefits'))}
                    />
                    <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => addArrayItem('benefits')}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {formData.benefits.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.benefits.map((item, idx) => (
                        <Badge key={idx} variant="secondary" className="flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                          {item}
                          <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeArrayItem('benefits', item)} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Keywords */}
                <div>
                  <Label className="text-xs flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" /> Từ khóa SEO
                  </Label>
                  <div className="flex gap-1.5 mt-1">
                    <Input
                      value={activeArrayField === 'keywords' ? newItem : ''}
                      onChange={e => { setNewItem(e.target.value); setActiveArrayField('keywords'); }}
                      onFocus={() => setActiveArrayField('keywords')}
                      placeholder="áo thun cotton..."
                      className="h-8 text-xs"
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('keywords'))}
                    />
                    <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => addArrayItem('keywords')}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {formData.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.keywords.map((item, idx) => (
                        <Badge key={idx} variant="outline" className="flex items-center gap-1 font-mono text-[11px]">
                          {item}
                          <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeArrayItem('keywords', item)} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="distribution" className="m-0 space-y-5 data-[state=inactive]:hidden" forceMount>
              <div>
                <Label className="text-xs font-medium">Góc khai thác content</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">Chọn các hướng tiếp cận AI nên ưu tiên khi gen content</p>
                <div className="flex flex-wrap gap-1.5">
                  {CONTENT_ANGLES.map(angle => (
                    <Badge
                      key={angle.value}
                      variant={formData.suggested_content_angles.includes(angle.value) ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-all hover:scale-105 text-xs',
                        formData.suggested_content_angles.includes(angle.value) && 'bg-primary'
                      )}
                      onClick={() => toggleArrayItem('suggested_content_angles', angle.value)}
                    >
                      {angle.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5" /> Kênh phù hợp nhất
                </Label>
                <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">AI sẽ ưu tiên các kênh này khi đề xuất phân phối</p>
                <div className="flex flex-wrap gap-1.5">
                  {BEST_CHANNELS.map(channel => (
                    <Badge
                      key={channel.value}
                      variant={formData.best_channels.includes(channel.value) ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-all hover:scale-105 text-xs',
                        formData.best_channels.includes(channel.value) && 'bg-primary'
                      )}
                      onClick={() => toggleArrayItem('best_channels', channel.value)}
                    >
                      {channel.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

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
            </TabsContent>
          </ScrollArea>
        </Tabs>

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
