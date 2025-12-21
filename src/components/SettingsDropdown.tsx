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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GeminiApiKeyInput } from './GeminiApiKeyInput';
import { useGeminiApiKey } from '@/hooks/useGeminiApiKey';
import { useBrandTemplates, BrandTemplate } from '@/hooks/useBrandTemplates';
import { BrandCard } from '@/components/BrandCard';
import { BrandForm } from '@/components/BrandForm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, Wifi, ExternalLink, Plus, ArrowLeft } from 'lucide-react';

interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
  modelsCount?: number;
  imageGenerationSupported?: boolean;
}

export function SettingsDropdown() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Cài đặt</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-popover">
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            Cài đặt API
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
  const { apiKey, isConfigured } = useGeminiApiKey();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast.error('Vui lòng nhập API key trước');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-gemini-connection', {
        body: { geminiApiKey: apiKey },
      });

      if (error) {
        setTestResult({ success: false, error: error.message });
        toast.error('Lỗi test kết nối');
      } else {
        setTestResult(data);
        if (data.success) {
          toast.success('Kết nối thành công!');
        } else {
          toast.error(data.error || 'Kết nối thất bại');
        }
      }
    } catch (error) {
      console.error('Test connection error:', error);
      setTestResult({ success: false, error: 'Lỗi không xác định' });
      toast.error('Lỗi test kết nối');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Cài đặt API
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Gemini Image Generation
            </h3>
            <GeminiApiKeyInput />

            {isConfigured && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    Test kết nối
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleTestConnection}
                    disabled={testing}
                    variant="outline"
                    className="w-full"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang test...
                      </>
                    ) : (
                      <>
                        <Wifi className="w-4 h-4 mr-2" />
                        Test kết nối API
                      </>
                    )}
                  </Button>

                  {testResult && (
                    <div
                      className={`p-3 rounded-lg ${
                        testResult.success
                          ? 'bg-green-500/10 border border-green-500/30'
                          : 'bg-destructive/10 border border-destructive/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {testResult.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                        <span
                          className={`font-medium text-sm ${
                            testResult.success ? 'text-green-600' : 'text-destructive'
                          }`}
                        >
                          {testResult.success ? testResult.message : testResult.error}
                        </span>
                      </div>
                      {testResult.success && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {testResult.modelsCount} models
                          </Badge>
                          {testResult.imageGenerationSupported && (
                            <Badge className="text-xs bg-green-500/20 text-green-600 border-green-500/30">
                              Image Generation ✓
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <h4 className="font-medium text-sm mb-2">Thông tin</h4>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• API key được lưu cục bộ trên trình duyệt của bạn</li>
                <li>• Gemini Image API sử dụng model gemini-2.0-flash-exp</li>
                <li>• Miễn phí với giới hạn số lượng request/phút</li>
              </ul>
              <a
                href="https://ai.google.dev/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-3"
              >
                <ExternalLink className="w-3 h-3" />
                Xem chi tiết pricing và quota
              </a>
            </CardContent>
          </Card>
        </div>
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
