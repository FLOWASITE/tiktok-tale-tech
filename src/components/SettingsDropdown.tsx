import { useState } from 'react';
import { Settings, Sparkles, Palette, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBrandTemplates, BrandTemplate } from '@/hooks/useBrandTemplates';
import { BrandCard } from '@/components/BrandCard';
import { BrandForm } from '@/components/BrandForm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, ArrowLeft } from 'lucide-react';
import { AIProviderSettings } from './AIProviderSettings';
import { useAIProviders } from '@/hooks/useAIProviders';
import { AI_PROVIDERS } from '@/types/aiProvider';
import { Badge } from '@/components/ui/badge';

export function SettingsDropdown() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const { config, getProviderConfig } = useAIProviders();
  const activeProvider = AI_PROVIDERS.find(p => p.id === config.selectedProvider);
  const isConfigured = !!getProviderConfig(config.selectedProvider);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Cài đặt</span>
            {isConfigured && activeProvider && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 hidden md:flex">
                {activeProvider.icon}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-popover">
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            Cài đặt API
            {isConfigured && (
              <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0">
                {activeProvider?.icon}
              </Badge>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setBrandOpen(true)}>
            <Palette className="w-4 h-4 mr-2" />
            Quản lý Brand
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <HelpCircle className="w-4 h-4 mr-2" />
            Hỗ trợ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsApiDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <BrandManagementDialogInner open={brandOpen} onOpenChange={setBrandOpen} />
    </>
  );
}

function SettingsApiDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Cài đặt AI Providers
          </DialogTitle>
        </DialogHeader>

        <AIProviderSettings />
      </DialogContent>
    </Dialog>
  );
}

function BrandManagementDialogInner({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { templates, loading, saveTemplate, updateTemplate, deleteTemplate, setDefaultTemplate, uploadLogo, deleteLogo } = useBrandTemplates();
  const [editingTemplate, setEditingTemplate] = useState<BrandTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCreate = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const handleEdit = (template: BrandTemplate) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setShowForm(false);
  };

  const handleSubmit = async (
    data: Omit<BrandTemplate, 'id' | 'created_at' | 'updated_at'>,
    logoFile?: File | null,
    shouldDeleteLogo?: boolean
  ) => {
    setSaving(true);
    try {
      let logoUrl = data.logo_url;

      if (shouldDeleteLogo && editingTemplate?.logo_url) {
        await deleteLogo(editingTemplate.logo_url);
        logoUrl = null;
      }

      if (logoFile) {
        if (editingTemplate?.logo_url) {
          await deleteLogo(editingTemplate.logo_url);
        }
        logoUrl = await uploadLogo(logoFile);
      }

      const templateData = { ...data, logo_url: logoUrl };

      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, templateData);
      } else {
        await saveTemplate(templateData);
      }
      setShowForm(false);
      setEditingTemplate(null);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultTemplate(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showForm && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancel}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <Palette className="w-5 h-5 text-primary" />
            {showForm
              ? editingTemplate
                ? 'Chỉnh sửa Brand Template'
                : 'Tạo Brand Template mới'
              : 'Quản lý Brand Templates'}
          </DialogTitle>
        </DialogHeader>

        {showForm ? (
          <BrandForm
            template={editingTemplate}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={saving}
          />
        ) : (
          <div className="space-y-4">
            <Button onClick={handleCreate} className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Thêm Brand Template mới
            </Button>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Đang tải...
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <Palette className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">
                  Chưa có brand template nào
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="grid gap-3">
                  {templates.map((template) => (
                    <BrandCard
                      key={template.id}
                      template={template}
                      onEdit={handleEdit}
                      onDelete={deleteTemplate}
                      onSetDefault={handleSetDefault}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
