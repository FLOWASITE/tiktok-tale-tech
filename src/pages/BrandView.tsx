import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useBrandTemplates, BrandTemplate, BrandScope } from '@/hooks/useBrandTemplates';
import { useCustomerPersonas } from '@/hooks/useCustomerPersonas';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import { BrandForm } from '@/components/BrandForm';
import { BrandViewHero } from '@/components/brand/BrandViewHero';
import { BrandViewOverviewTab } from '@/components/brand/BrandViewOverviewTab';
import { BrandViewVoiceTab } from '@/components/brand/BrandViewVoiceTab';
import { BrandViewStrategyTab } from '@/components/brand/BrandViewStrategyTab';
import { BrandViewChannelsTab } from '@/components/brand/BrandViewChannelsTab';
import { BrandViewConnectionsTab } from '@/components/brand/BrandViewConnectionsTab';
import { BrandViewSamplesTab } from '@/components/brand/BrandViewSamplesTab';
import { BrandViewPersonasTab } from '@/components/brand/BrandViewPersonasTab';
import { BrandViewProductsTab } from '@/components/brand/BrandViewProductsTab';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Loader2,
  Palette,
  LayoutDashboard,
  Volume2,
  Target,
  Settings2,
  FileText,
  Users,
  Package,
  Share2,
} from 'lucide-react';
import { calculateBrandCompleteness } from '@/utils/brandCompleteness';
import { toast } from 'sonner';
import { isBrandTemplateChanged } from '@/utils/isBrandTemplateChanged';

type BrandFormData = Omit<BrandTemplate, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'organization_id'>;

export default function BrandView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const {
    templates,
    loading,
    updateTemplate,
    deleteTemplate,
    setDefaultTemplate,
    duplicateTemplate,
    uploadLogo,
    deleteLogo,
    refetch,
  } = useBrandTemplates();
  const [refreshing, setRefreshing] = useState(false);
  const [template, setTemplate] = useState<BrandTemplate | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch personas and products for completeness calculation
  const { personas } = useCustomerPersonas({ brandTemplateId: id, enabled: !!id });
  const { products } = useProductCatalog(id);

  useEffect(() => {
    if (!loading && id) {
      const found = templates.find((t) => t.id === id);
      setTemplate(found || null);
    }
  }, [templates, loading, id]);

  // Calculate brand completeness
  const completeness = template 
    ? calculateBrandCompleteness(template, personas.length, products.length)
    : null;

  const handleSubmit = async (
    data: BrandFormData,
    scope: BrandScope,
    logoFile?: File | null,
    shouldDeleteLogo?: boolean
  ): Promise<BrandTemplate | null> => {
    if (!template) return null;

    setSaving(true);
    try {
      let logoUrl = data.logo_url;

      if (shouldDeleteLogo && template.logo_url) {
        await deleteLogo(template.logo_url);
        logoUrl = null;
      }

      if (logoFile) {
        if (template.logo_url) {
          await deleteLogo(template.logo_url);
        }
        logoUrl = await uploadLogo(logoFile);
      }

      const templateData = { ...data, logo_url: logoUrl };

      if (!logoFile && !shouldDeleteLogo && !isBrandTemplateChanged(template, templateData)) {
        setEditDialogOpen(false);
        return null;
      }

      await updateTemplate(template.id, templateData);
      setEditDialogOpen(false);
      toast.success('Đã cập nhật brand template');
      await refetch();
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
    toast.success('Đã làm mới dữ liệu');
  };

  const handleDelete = async () => {
    if (!template) return;
    await deleteTemplate(template.id);
    toast.success('Đã xóa brand template');
    navigate('/brands');
  };

  const handleSetDefault = async () => {
    if (!template) return;
    await setDefaultTemplate(template.id);
    toast.success('Đã đặt làm mặc định');
  };

  const handleDuplicate = async () => {
    if (!template) return;
    await duplicateTemplate(template.id);
    toast.success('Đã tạo bản sao');
    navigate('/brands');
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto py-12 text-center space-y-4">
        <Palette className="w-16 h-16 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">Không tìm thấy Brand</h2>
        <p className="text-muted-foreground">
          Brand template này không tồn tại hoặc đã bị xóa.
        </p>
        <Button asChild>
          <Link to="/brands">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại danh sách
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 md:py-6 px-4 md:px-6 space-y-4 md:space-y-6" style={{ maxWidth: '1150px' }}>
      {/* Hero Section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <BrandViewHero
          template={template}
          onEdit={() => setEditDialogOpen(true)}
          onDelete={handleDelete}
          onSetDefault={handleSetDefault}
          onDuplicate={handleDuplicate}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          completeness={completeness}
          personasCount={personas.length}
          productsCount={products.length}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="overview" className="gap-1.5 text-xs md:text-sm data-[state=active]:bg-background">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tổng quan</span>
            <span className="sm:hidden">TQ</span>
          </TabsTrigger>
          <TabsTrigger value="voice" className="gap-1.5 text-xs md:text-sm data-[state=active]:bg-background">
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Brand Voice</span>
            <span className="sm:hidden">Voice</span>
          </TabsTrigger>
          <TabsTrigger value="personas" className="gap-1.5 text-xs md:text-sm data-[state=active]:bg-background">
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Personas</span>
            {personas.length > 0 && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">
                {personas.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5 text-xs md:text-sm data-[state=active]:bg-background">
            <Package className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sản phẩm</span>
            <span className="sm:hidden">SP</span>
            {products.length > 0 && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">
                {products.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="strategy" className="gap-1.5 text-xs md:text-sm data-[state=active]:bg-background">
            <Target className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chiến lược</span>
            <span className="sm:hidden">CL</span>
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-1.5 text-xs md:text-sm data-[state=active]:bg-background">
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kênh</span>
          </TabsTrigger>
          <TabsTrigger value="connections" className="gap-1.5 text-xs md:text-sm data-[state=active]:bg-background">
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kết nối</span>
          </TabsTrigger>
          <TabsTrigger value="samples" className="gap-1.5 text-xs md:text-sm data-[state=active]:bg-background">
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Samples</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 animate-in fade-in duration-200">
          <BrandViewOverviewTab template={template} />
        </TabsContent>

        <TabsContent value="voice" className="mt-4 animate-in fade-in duration-200">
          <BrandViewVoiceTab template={template} />
        </TabsContent>

        <TabsContent value="personas" className="mt-4 animate-in fade-in duration-200">
          <BrandViewPersonasTab template={template} />
        </TabsContent>

        <TabsContent value="products" className="mt-4 animate-in fade-in duration-200">
          <BrandViewProductsTab template={template} />
        </TabsContent>

        <TabsContent value="strategy" className="mt-4 animate-in fade-in duration-200">
          <BrandViewStrategyTab template={template} />
        </TabsContent>

        <TabsContent value="channels" className="mt-4 animate-in fade-in duration-200">
          <BrandViewChannelsTab template={template} />
        </TabsContent>

        <TabsContent value="connections" className="mt-4 animate-in fade-in duration-200">
          <BrandViewConnectionsTab template={template} />
        </TabsContent>

        <TabsContent value="samples" className="mt-4 animate-in fade-in duration-200">
          <BrandViewSamplesTab template={template} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[45vw] w-[45vw] max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <Palette className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              Chỉnh sửa Brand Template
            </DialogTitle>
          </DialogHeader>
          <BrandForm
            template={template}
            onSubmit={handleSubmit}
            onCancel={() => setEditDialogOpen(false)}
            isLoading={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
