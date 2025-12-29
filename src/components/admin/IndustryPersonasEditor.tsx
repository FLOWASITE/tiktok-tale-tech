import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Users, Plus, Trash2, Edit, X, 
  Target, Brain, ShoppingCart, Sparkles,
  Heart, Lightbulb, MessageCircle, Cpu, Save,
  Copy, ToggleLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIndustryPersonas } from '@/hooks/useIndustryPersonas';
import {
  IndustryPersona,
  ContentPreferences,
  COMMUNICATION_STYLES,
  RESPONSE_TONE_HINTS,
  CONTENT_FORMAT_OPTIONS,
  INDUSTRY_PERSONA_TEMPLATES,
  createEmptyIndustryPersona,
  getDefaultContentPreferences,
} from '@/types/industryPersona';
import { AGE_RANGES, GENDER_OPTIONS, INCOME_LEVELS, AVATAR_EMOJIS, FUNNEL_STAGES } from '@/types/customerPersona';

interface IndustryPersonasEditorProps {
  industryTemplateId: string;
  industryName?: string;
  targetAudience?: 'B2B' | 'B2C';
}

export function IndustryPersonasEditor({
  industryTemplateId,
  industryName = 'Industry',
  targetAudience = 'B2B',
}: IndustryPersonasEditorProps) {
  const { personas, isLoading, createPersona, updatePersona, deletePersona, refresh } = useIndustryPersonas({
    industryTemplateId,
    enabled: true,
  });
  
  const [editingPersona, setEditingPersona] = useState<IndustryPersona | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleCreate = async (template?: Partial<IndustryPersona>) => {
    setIsCreating(true);
    try {
      const newPersona = createEmptyIndustryPersona(industryTemplateId);
      if (template) {
        Object.assign(newPersona, template);
      }
      const created = await createPersona(newPersona);
      if (created) {
        setEditingPersona(created);
      }
      setShowTemplates(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = async () => {
    if (!editingPersona) return;
    await updatePersona(editingPersona.id, editingPersona);
    setEditingPersona(null);
  };

  const handleDelete = async (id: string) => {
    await deletePersona(id);
    if (editingPersona?.id === id) {
      setEditingPersona(null);
    }
  };

  const updateEditingPersona = (updates: Partial<IndustryPersona>) => {
    if (!editingPersona) return;
    setEditingPersona({ ...editingPersona, ...updates });
  };

  const handleAddTag = (field: keyof IndustryPersona, value: string) => {
    if (!editingPersona || !value.trim()) return;
    const currentArray = (editingPersona[field] as string[]) || [];
    if (!currentArray.includes(value.trim())) {
      updateEditingPersona({ [field]: [...currentArray, value.trim()] });
    }
  };

  const handleRemoveTag = (field: keyof IndustryPersona, value: string) => {
    if (!editingPersona) return;
    const currentArray = (editingPersona[field] as string[]) || [];
    updateEditingPersona({ [field]: currentArray.filter(v => v !== value) });
  };

  const updateContentPreferences = (key: keyof ContentPreferences, value: unknown) => {
    if (!editingPersona) return;
    updateEditingPersona({
      content_preferences: {
        ...editingPersona.content_preferences,
        [key]: value,
      },
    });
  };

  const templates = INDUSTRY_PERSONA_TEMPLATES[targetAudience] || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Industry Personas</h3>
            <p className="text-sm text-muted-foreground">
              Template personas cho {industryName}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Popover open={showTemplates} onOpenChange={setShowTemplates}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Sparkles className="w-4 h-4 mr-1.5" />
                Từ Template
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-2">
                <p className="text-sm font-medium">Chọn template {targetAudience}</p>
                {templates.map((template, idx) => (
                  <Card
                    key={idx}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => handleCreate(template)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <span className="text-2xl">{template.avatar_emoji}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{template.name}</p>
                        <p className="text-xs text-muted-foreground">{template.occupation}</p>
                      </div>
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button size="sm" onClick={() => handleCreate()} disabled={isCreating}>
            <Plus className="w-4 h-4 mr-1.5" />
            Tạo mới
          </Button>
        </div>
      </div>

      {/* Personas Grid */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
      ) : personas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium">Chưa có Industry Persona</p>
            <p className="text-sm text-muted-foreground mb-4">
              Tạo personas mẫu để user có thể import vào brand
            </p>
            <Button onClick={() => handleCreate()}>
              <Plus className="w-4 h-4 mr-1.5" />
              Tạo Persona đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona) => (
            <Card
              key={persona.id}
              className={cn(
                "transition-all hover:border-primary/50 cursor-pointer",
                !persona.is_active && "opacity-50"
              )}
              onClick={() => setEditingPersona(persona)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{persona.avatar_emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{persona.name}</h4>
                        {!persona.is_active && (
                          <Badge variant="secondary" className="text-xs">Ẩn</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{persona.occupation || 'Chưa xác định'}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* AI Enhancement Badge */}
                {persona.communication_style && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <Badge variant="outline" className="text-xs gap-1">
                      <Cpu className="w-3 h-3" />
                      {COMMUNICATION_STYLES.find(s => s.value === persona.communication_style)?.label}
                    </Badge>
                    {persona.response_tone_hints.slice(0, 2).map((hint, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {RESPONSE_TONE_HINTS.find(h => h.value === hint)?.label || hint}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Quick Stats */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {persona.pain_points.slice(0, 2).map((p, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px] bg-destructive/10 text-destructive">
                      {p}
                    </Badge>
                  ))}
                  {persona.desires.slice(0, 1).map((d, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600">
                      {d}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Sheet */}
      <Sheet open={!!editingPersona} onOpenChange={(open) => !open && setEditingPersona(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {editingPersona && (
                <>
                  <span className="text-2xl">{editingPersona.avatar_emoji}</span>
                  {editingPersona.name || 'Persona mới'}
                </>
              )}
            </SheetTitle>
            <SheetDescription>
              Chỉnh sửa Industry Persona template
            </SheetDescription>
          </SheetHeader>

          {editingPersona && (
            <ScrollArea className="h-[calc(100vh-200px)] pr-4 mt-4">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Thông tin cơ bản
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tên persona</Label>
                      <Input
                        value={editingPersona.name}
                        onChange={(e) => updateEditingPersona({ name: e.target.value })}
                        placeholder="VD: Decision Maker"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Avatar</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start gap-2">
                            <span className="text-lg">{editingPersona.avatar_emoji}</span>
                            <span className="text-xs text-muted-foreground">Chọn emoji</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2">
                          <div className="grid grid-cols-5 gap-1">
                            {AVATAR_EMOJIS.map((emoji) => (
                              <Button
                                key={emoji}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-lg"
                                onClick={() => updateEditingPersona({ avatar_emoji: emoji })}
                              >
                                {emoji}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <ToggleLeft className="w-4 h-4" />
                      <span className="text-sm">Hiển thị cho users</span>
                    </div>
                    <Switch
                      checked={editingPersona.is_active}
                      onCheckedChange={(checked) => updateEditingPersona({ is_active: checked })}
                    />
                  </div>
                </div>

                {/* Demographics */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Nhân khẩu học</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={editingPersona.age_range || ''}
                      onValueChange={(v) => updateEditingPersona({ age_range: v })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Độ tuổi" />
                      </SelectTrigger>
                      <SelectContent>
                        {AGE_RANGES.map((age) => (
                          <SelectItem key={age} value={age}>{age}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={editingPersona.gender || ''}
                      onValueChange={(v) => updateEditingPersona({ gender: v as 'male' | 'female' | 'all' })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Giới tính" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((g) => (
                          <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={editingPersona.income_level || ''}
                      onValueChange={(v) => updateEditingPersona({ income_level: v as 'low' | 'medium' | 'high' | 'very_high' })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Thu nhập" />
                      </SelectTrigger>
                      <SelectContent>
                        {INCOME_LEVELS.map((i) => (
                          <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Nghề nghiệp..."
                      value={editingPersona.occupation || ''}
                      onChange={(e) => updateEditingPersona({ occupation: e.target.value })}
                    />
                    <Input
                      placeholder="Khu vực..."
                      value={editingPersona.location || ''}
                      onChange={(e) => updateEditingPersona({ location: e.target.value })}
                    />
                  </div>
                </div>

                {/* Psychographics */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Tâm lý học
                  </h4>
                  <TagInputField
                    label="Pain Points"
                    tags={editingPersona.pain_points}
                    onAdd={(v) => handleAddTag('pain_points', v)}
                    onRemove={(v) => handleRemoveTag('pain_points', v)}
                    badgeClassName="bg-destructive/10 text-destructive"
                    placeholder="Thêm pain point..."
                  />
                  <TagInputField
                    label="Desires"
                    tags={editingPersona.desires}
                    onAdd={(v) => handleAddTag('desires', v)}
                    onRemove={(v) => handleRemoveTag('desires', v)}
                    badgeClassName="bg-emerald-500/10 text-emerald-600"
                    placeholder="Thêm desire..."
                  />
                  <TagInputField
                    label="Objections"
                    tags={editingPersona.objections}
                    onAdd={(v) => handleAddTag('objections', v)}
                    onRemove={(v) => handleRemoveTag('objections', v)}
                    badgeClassName="bg-amber-500/10 text-amber-600"
                    placeholder="Thêm objection..."
                  />
                </div>

                {/* Funnel Stage */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Giai đoạn Funnel</h4>
                  <div className="flex gap-2">
                    {FUNNEL_STAGES.map((stage) => (
                      <Button
                        key={stage.value}
                        variant={editingPersona.typical_funnel_stage === stage.value ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => updateEditingPersona({ typical_funnel_stage: stage.value })}
                      >
                        <div className="text-center">
                          <div className="text-xs font-medium">{stage.label}</div>
                          <div className="text-[10px] opacity-70">{stage.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* AI Enhancement Section */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-primary" />
                      AI Enhancement
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Hướng dẫn AI tạo nội dung phù hợp với persona này
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Communication Style */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Phong cách giao tiếp</Label>
                      <Select
                        value={editingPersona.communication_style || ''}
                        onValueChange={(v) => updateEditingPersona({ communication_style: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn phong cách..." />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMUNICATION_STYLES.map((style) => (
                            <SelectItem key={style.value} value={style.value}>
                              <div>
                                <div className="font-medium">{style.label}</div>
                                <div className="text-xs text-muted-foreground">{style.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Response Tone Hints */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tone gợi ý cho AI</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {RESPONSE_TONE_HINTS.map((hint) => {
                          const isSelected = editingPersona.response_tone_hints.includes(hint.value);
                          return (
                            <Badge
                              key={hint.value}
                              variant={isSelected ? 'default' : 'outline'}
                              className="cursor-pointer transition-colors"
                              onClick={() => {
                                if (isSelected) {
                                  handleRemoveTag('response_tone_hints', hint.value);
                                } else {
                                  handleAddTag('response_tone_hints', hint.value);
                                }
                              }}
                            >
                              {hint.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    {/* Content Preferences */}
                    <div className="space-y-2">
                      <Label className="text-xs">Sở thích nội dung</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Select
                          value={editingPersona.content_preferences?.format || 'medium'}
                          onValueChange={(v) => updateContentPreferences('format', v)}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTENT_FORMAT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {[
                          { key: 'visual', label: 'Visual' },
                          { key: 'storytelling', label: 'Storytelling' },
                          { key: 'data_driven', label: 'Data-driven' },
                          { key: 'emotional', label: 'Emotional' },
                          { key: 'practical', label: 'Practical' },
                        ].map(({ key, label }) => (
                          <Badge
                            key={key}
                            variant={editingPersona.content_preferences?.[key as keyof ContentPreferences] ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => updateContentPreferences(
                              key as keyof ContentPreferences,
                              !editingPersona.content_preferences?.[key as keyof ContentPreferences]
                            )}
                          >
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Persona Prompt Hints */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">AI Prompt Hints</Label>
                      <Textarea
                        value={editingPersona.persona_prompt_hints || ''}
                        onChange={(e) => updateEditingPersona({ persona_prompt_hints: e.target.value })}
                        placeholder="Hướng dẫn AI khi tạo nội dung cho persona này. VD: Focus on ROI, use data and case studies, avoid jargon..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-2 sticky bottom-0 bg-background pt-4 pb-2 border-t">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-1.5">
                        <Trash2 className="w-4 h-4" />
                        Xóa
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Xóa Industry Persona?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Hành động này không thể hoàn tác. Persona sẽ bị xóa vĩnh viễn.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(editingPersona.id)}>
                          Xóa
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingPersona(null)}>
                    Hủy
                  </Button>
                  <Button size="sm" className="flex-1 gap-1.5" onClick={handleSave}>
                    <Save className="w-4 h-4" />
                    Lưu
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Helper component for tag input
interface TagInputFieldProps {
  label: string;
  tags: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder?: string;
  badgeClassName?: string;
}

function TagInputField({ label, tags, onAdd, onRemove, placeholder, badgeClassName }: TagInputFieldProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={handleAdd} disabled={!inputValue.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, idx) => (
            <Badge key={idx} variant="secondary" className={cn("text-xs gap-1", badgeClassName)}>
              {tag}
              <X className="w-3 h-3 cursor-pointer" onClick={() => onRemove(tag)} />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
