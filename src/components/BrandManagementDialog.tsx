import { useState } from 'react';
import { useBrandTemplates, BrandTemplate, BrandScope } from '@/hooks/useBrandTemplates';
import { BrandCard } from '@/components/BrandCard';
import { BrandForm } from '@/components/BrandForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Palette, Plus, ArrowLeft } from 'lucide-react';
import { isBrandTemplateChanged } from '@/utils/isBrandTemplateChanged';

// Type for form data without ownership fields
type BrandFormData = Omit<BrandTemplate, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'organization_id'>;

export function BrandManagementDialog() {
  const { templates, loading, saveTemplate, updateTemplate, deleteTemplate, setDefaultTemplate, uploadLogo, deleteLogo } = useBrandTemplates();
  const [open, setOpen] = useState(false);
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
    data: BrandFormData,
    scope: BrandScope,
    logoFile?: File | null,
    shouldDeleteLogo?: boolean
  ): Promise<BrandTemplate | null> => {
    setSaving(true);
    try {
      let logoUrl = data.logo_url;

      // Handle logo deletion
      if (shouldDeleteLogo && editingTemplate?.logo_url) {
        await deleteLogo(editingTemplate.logo_url);
        logoUrl = null;
      }

      // Handle new logo upload
      if (logoFile) {
        // Delete old logo first if exists
        if (editingTemplate?.logo_url) {
          await deleteLogo(editingTemplate.logo_url);
        }
        logoUrl = await uploadLogo(logoFile);
      }

      const templateData = { ...data, logo_url: logoUrl };

      if (editingTemplate) {
        if (!logoFile && !shouldDeleteLogo && !isBrandTemplateChanged(editingTemplate, templateData)) {
          setShowForm(false);
          setEditingTemplate(null);
          return null;
        }
        await updateTemplate(editingTemplate.id, templateData);
        setShowForm(false);
        setEditingTemplate(null);
        return null;
      } else {
        const newTemplate = await saveTemplate(templateData, scope);
        setShowForm(false);
        setEditingTemplate(null);
        return newTemplate;
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultTemplate(id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="w-4 h-4" />
          Quản lý Brand
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90rem] max-h-[90vh] w-[95vw] overflow-y-auto">
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
