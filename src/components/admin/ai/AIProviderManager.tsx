import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useAIConfig, AI_PROVIDERS, MODELS_BY_PROVIDER, AIProviderConfig } from '@/hooks/useAIConfig';
import { Check, X, Settings, Plus, Trash2, ExternalLink, Sparkles, Search, Flame, Bot, Wand2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AIProviderManagerProps {
  organizationId?: string;
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  lovable: <Sparkles className="h-5 w-5 text-primary" />,
  perplexity: <Search className="h-5 w-5 text-blue-500" />,
  firecrawl: <Flame className="h-5 w-5 text-orange-500" />,
  openai: <Bot className="h-5 w-5 text-green-500" />,
  anthropic: <Wand2 className="h-5 w-5 text-purple-500" />,
  gemini: <Sparkles className="h-5 w-5 text-yellow-500" />,
  replicate: <Wand2 className="h-5 w-5 text-cyan-500" />,
  custom: <Settings className="h-5 w-5 text-muted-foreground" />,
};

export function AIProviderManager({ organizationId }: AIProviderManagerProps) {
  const { providers, isLoading, upsertProvider, deleteProvider } = useAIConfig(organizationId);
  const [editingProvider, setEditingProvider] = useState<Partial<AIProviderConfig> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSaveProvider = () => {
    if (!editingProvider?.providerType) return;
    upsertProvider({
      ...editingProvider,
      providerType: editingProvider.providerType,
    });
    setIsDialogOpen(false);
    setEditingProvider(null);
  };

  const getConfiguredProvider = (type: string) => {
    return providers.find(p => p.providerType === type);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">AI Providers</h3>
          <p className="text-sm text-muted-foreground">
            Quản lý các nhà cung cấp AI và API keys
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AI_PROVIDERS.map((provider) => {
          const configured = getConfiguredProvider(provider.type);
          const isBuiltIn = provider.type === 'lovable';
          const hasConnector = provider.type === 'perplexity' || provider.type === 'firecrawl';
          
          return (
            <Card key={provider.type} className={configured?.isActive || isBuiltIn ? 'border-primary/50' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {PROVIDER_ICONS[provider.type]}
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                  </div>
                  {isBuiltIn ? (
                    <Badge variant="default" className="bg-primary">Built-in</Badge>
                  ) : configured ? (
                    <Badge variant={configured.isActive ? 'default' : 'secondary'}>
                      {configured.isActive ? (
                        <><Check className="h-3 w-3 mr-1" /> Active</>
                      ) : (
                        <><X className="h-3 w-3 mr-1" /> Inactive</>
                      )}
                    </Badge>
                  ) : hasConnector ? (
                    <Badge variant="outline">Connector</Badge>
                  ) : (
                    <Badge variant="outline">Not configured</Badge>
                  )}
                </div>
                <CardDescription>{provider.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {isBuiltIn ? (
                  <div className="text-sm text-muted-foreground">
                    <p>Sử dụng Lovable AI Gateway - không cần cấu hình API key.</p>
                    <p className="mt-1 text-xs">
                      Models: gemini-2.5-pro, gpt-5, gpt-5-mini...
                    </p>
                  </div>
                ) : hasConnector ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Đã kết nối qua Connector
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingProvider(configured || { providerType: provider.type, displayName: provider.name });
                          setIsDialogOpen(true);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Cấu hình
                      </Button>
                    </div>
                  </div>
                ) : configured ? (
                  <div className="space-y-3">
                    {configured.defaultModel && (
                      <p className="text-sm">
                        Model: <span className="font-medium">{configured.defaultModel}</span>
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingProvider(configured);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Chỉnh sửa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProvider(configured.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setEditingProvider({ providerType: provider.type, displayName: provider.name });
                      setIsDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Cấu hình
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProvider?.id ? 'Chỉnh sửa' : 'Thêm'} Provider: {editingProvider?.displayName}
            </DialogTitle>
          </DialogHeader>
          
          {editingProvider && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tên hiển thị</Label>
                <Input
                  value={editingProvider.displayName || ''}
                  onChange={(e) => setEditingProvider({ ...editingProvider, displayName: e.target.value })}
                  placeholder="Provider name"
                />
              </div>

              {editingProvider.providerType === 'custom' && (
                <div className="space-y-2">
                  <Label>Base URL</Label>
                  <Input
                    value={editingProvider.baseUrl || ''}
                    onChange={(e) => setEditingProvider({ ...editingProvider, baseUrl: e.target.value })}
                    placeholder="https://api.example.com/v1"
                  />
                </div>
              )}

              {MODELS_BY_PROVIDER[editingProvider.providerType!]?.length > 0 && (
                <div className="space-y-2">
                  <Label>Default Model</Label>
                  <Select
                    value={editingProvider.defaultModel || ''}
                    onValueChange={(value) => setEditingProvider({ ...editingProvider, defaultModel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn model mặc định" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS_BY_PROVIDER[editingProvider.providerType!].map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Kích hoạt</Label>
                <Switch
                  checked={editingProvider.isActive ?? true}
                  onCheckedChange={(checked) => setEditingProvider({ ...editingProvider, isActive: checked })}
                />
              </div>

              {AI_PROVIDERS.find(p => p.type === editingProvider.providerType)?.hasKey && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="text-muted-foreground">
                    💡 API Key được quản lý qua Supabase Secrets. 
                    {editingProvider.apiKeySecretName && (
                      <span className="block mt-1">
                        Secret: <code className="bg-background px-1 rounded">{editingProvider.apiKeySecretName}</code>
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveProvider}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
