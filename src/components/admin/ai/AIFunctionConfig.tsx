import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAIConfig, AI_FUNCTIONS, MODELS_BY_TYPE, AIFunctionType, AIFunctionConfig as FunctionConfigType } from '@/hooks/useAIConfig';
import { Settings, Check, X, Zap, MessageSquare, Lightbulb, Search, Image, Wand2, Type, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AIFunctionConfigProps {
  organizationId?: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  content: <Zap className="h-4 w-4" />,
  chat: <MessageSquare className="h-4 w-4" />,
  ideation: <Lightbulb className="h-4 w-4" />,
  research: <Search className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  brand: <Wand2 className="h-4 w-4" />,
  analysis: <Search className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  content: 'bg-blue-500/10 text-blue-500',
  chat: 'bg-green-500/10 text-green-500',
  ideation: 'bg-yellow-500/10 text-yellow-500',
  research: 'bg-purple-500/10 text-purple-500',
  image: 'bg-pink-500/10 text-pink-500',
  brand: 'bg-orange-500/10 text-orange-500',
  analysis: 'bg-cyan-500/10 text-cyan-500',
};

const TYPE_BADGES: Record<AIFunctionType, { label: string; className: string; icon: React.ReactNode }> = {
  text: { label: 'Text', className: 'bg-blue-500/20 text-blue-600 border-blue-500/30', icon: <Type className="h-3 w-3" /> },
  image: { label: 'Image', className: 'bg-purple-500/20 text-purple-600 border-purple-500/30', icon: <Image className="h-3 w-3" /> },
  'image-direct': { label: 'Image (Direct)', className: 'bg-orange-500/20 text-orange-600 border-orange-500/30', icon: <Image className="h-3 w-3" /> },
  search: { label: 'Search', className: 'bg-green-500/20 text-green-600 border-green-500/30', icon: <Globe className="h-3 w-3" /> },
};

// Helper function to get models for a function type
const getModelsForFunction = (functionName: string): string[] => {
  const func = AI_FUNCTIONS.find(f => f.name === functionName);
  if (!func) return MODELS_BY_TYPE.text;
  return MODELS_BY_TYPE[func.type] || MODELS_BY_TYPE.text;
};

// Helper function to get function metadata
const getFunctionMeta = (functionName: string) => {
  return AI_FUNCTIONS.find(f => f.name === functionName);
};

export function AIFunctionConfigComponent({ organizationId }: AIFunctionConfigProps) {
  const { functions, isLoading, upsertFunction } = useAIConfig(organizationId);
  const [editingFunction, setEditingFunction] = useState<Partial<FunctionConfigType> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSaveFunction = () => {
    if (!editingFunction?.functionName) return;
    upsertFunction({
      ...editingFunction,
      functionName: editingFunction.functionName,
      temperature: editingFunction.temperature ?? null,
      maxTokens: editingFunction.maxTokens ?? null,
    });
    setIsDialogOpen(false);
    setEditingFunction(null);
  };

  const getConfiguredFunction = (name: string) => {
    return functions.find(f => f.functionName === name);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Function Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Cấu hình AI model và parameters cho từng edge function
          </p>
        </div>
        <div className="flex gap-2">
          {Object.entries(TYPE_BADGES).map(([type, badge]) => (
            <Badge key={type} variant="outline" className={`${badge.className} text-xs`}>
              {badge.icon}
              <span className="ml-1">{badge.label}</span>
            </Badge>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Function</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Model</TableHead>
                <TableHead>Cache TTL</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {AI_FUNCTIONS.map((fn) => {
                const config = getConfiguredFunction(fn.name);
                const category = fn.category;
                const typeBadge = TYPE_BADGES[fn.type];
                const displayModel = config?.modelOverride || fn.currentModel;
                
                return (
                  <TableRow key={fn.name}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{fn.name}</p>
                        <p className="text-xs text-muted-foreground">{fn.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${typeBadge.className} text-xs`}>
                        {typeBadge.icon}
                        <span className="ml-1">{typeBadge.label}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={CATEGORY_COLORS[category]}>
                        <span className="mr-1">{CATEGORY_ICONS[category]}</span>
                        {category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono text-xs">
                        {displayModel}
                      </span>
                      {config?.modelOverride && (
                        <Badge variant="outline" className="ml-2 text-xs">Override</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {config?.cacheTtlHours || 24}h
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {config ? (
                        config.isEnabled ? (
                          <Badge variant="default" className="bg-green-500">
                            <Check className="h-3 w-3 mr-1" /> On
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <X className="h-3 w-3 mr-1" /> Off
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline">Default</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingFunction(config || { 
                            functionName: fn.name,
                            isEnabled: true,
                            cacheTtlHours: 24,
                            priorityLevel: 'normal',
                            temperature: 0.7,
                            maxTokens: null,
                            parameters: {},
                          });
                          setIsDialogOpen(true);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Cấu hình: {editingFunction?.functionName}
              {editingFunction?.functionName && (
                <Badge variant="outline" className={TYPE_BADGES[getFunctionMeta(editingFunction.functionName)?.type || 'text'].className}>
                  {TYPE_BADGES[getFunctionMeta(editingFunction.functionName)?.type || 'text'].label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {editingFunction && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Label>Kích hoạt function</Label>
                <Switch
                  checked={editingFunction.isEnabled ?? true}
                  onCheckedChange={(checked) => setEditingFunction({ ...editingFunction, isEnabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Model Override</Label>
                <Select
                  value={editingFunction.modelOverride || '_default'}
                  onValueChange={(value) => setEditingFunction({ 
                    ...editingFunction, 
                    modelOverride: value === '_default' ? null : value 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sử dụng model mặc định" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_default">
                      Mặc định ({getFunctionMeta(editingFunction.functionName!)?.currentModel || 'Auto'})
                    </SelectItem>
                    {getModelsForFunction(editingFunction.functionName!).map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                        {model === getFunctionMeta(editingFunction.functionName!)?.currentModel && (
                          <span className="ml-2 text-muted-foreground">(recommended)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Chỉ hiển thị models phù hợp với loại function ({getFunctionMeta(editingFunction.functionName!)?.type})
                </p>
              </div>

              {getFunctionMeta(editingFunction.functionName!)?.type === 'text' && (
                <>
                  <div className="space-y-2">
                    <Label>Temperature: {editingFunction.temperature ?? 0.7}</Label>
                    <Slider
                      value={[editingFunction.temperature ?? 0.7]}
                      min={0}
                      max={2}
                      step={0.1}
                      onValueChange={([value]) => setEditingFunction({ 
                        ...editingFunction, 
                        temperature: value,
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      0 = Deterministic, 2 = Creative
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Tokens</Label>
                    <Input
                      type="number"
                      value={editingFunction.maxTokens || ''}
                      onChange={(e) => setEditingFunction({ 
                        ...editingFunction, 
                        maxTokens: e.target.value ? parseInt(e.target.value) : null,
                      })}
                      placeholder="Default (auto)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Giới hạn tokens output. Để trống = auto
                    </p>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Cache TTL (giờ)</Label>
                <Input
                  type="number"
                  value={editingFunction.cacheTtlHours ?? 24}
                  onChange={(e) => setEditingFunction({ 
                    ...editingFunction, 
                    cacheTtlHours: parseInt(e.target.value) || 24
                  })}
                  min={1}
                  max={168}
                />
                <p className="text-xs text-muted-foreground">
                  Thời gian cache response (1-168 giờ)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Priority Level</Label>
                <Select
                  value={editingFunction.priorityLevel || 'normal'}
                  onValueChange={(value) => setEditingFunction({ ...editingFunction, priorityLevel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (Queue)</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High (Priority)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveFunction}>
              Lưu cấu hình
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
