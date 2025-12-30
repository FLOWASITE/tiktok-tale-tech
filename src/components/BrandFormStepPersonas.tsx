import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Users, Plus, Trash2, Star, X, 
  Target, Brain, ShoppingCart, Sparkles,
  Heart, Lightbulb, MessageCircle, Globe, BookOpen, Zap,
  Download, Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CustomerPersona,
  FunnelStage,
  FUNNEL_STAGES,
  INCOME_LEVELS,
  AGE_RANGES,
  GENDER_OPTIONS,
  AVATAR_EMOJIS,
  PERSONA_TEMPLATES,
} from '@/types/customerPersona';
import { useIndustryPersonasForImport } from '@/hooks/useIndustryPersonas';

// Predefined options
const PREFERRED_CHANNEL_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'email', label: 'Email' },
  { value: 'zalo', label: 'Zalo' },
  { value: 'website', label: 'Website' },
];

const INFORMATION_SOURCE_OPTIONS = [
  'Google Search',
  'Social Media',
  'Bạn bè giới thiệu',
  'Review online',
  'KOL/Influencer',
  'Quảng cáo',
  'Báo chí/Blog',
  'Sự kiện/Hội thảo',
];

interface BrandFormStepPersonasProps {
  personas: CustomerPersona[];
  onPersonasChange: (personas: CustomerPersona[]) => void;
  brandPositioning?: string;
  brandName?: string;
  disabled?: boolean;
  industryTemplateId?: string | null;
}

export function BrandFormStepPersonas({
  personas,
  onPersonasChange,
  brandPositioning,
  brandName,
  disabled = false,
  industryTemplateId,
}: BrandFormStepPersonasProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showIndustryImport, setShowIndustryImport] = useState(false);
  
  // Fetch industry personas for import
  const { personas: industryPersonas, isLoading: loadingIndustry } = useIndustryPersonasForImport(industryTemplateId);

  // Get template type based on brand positioning
  const templateType = brandPositioning === 'business' || brandPositioning === 'consultant' ? 'B2B' : 'B2C';

  const addPersona = (template?: Partial<CustomerPersona>) => {
    if (personas.length >= 5) return;
    
    const newPersona: CustomerPersona = {
      id: `temp-${Date.now()}`,
      brand_template_id: '',
      name: template?.name || `Persona ${personas.length + 1}`,
      avatar_emoji: template?.avatar_emoji || '👤',
      is_primary: personas.length === 0,
      age_range: template?.age_range || null,
      gender: template?.gender || null,
      location: null,
      income_level: template?.income_level || null,
      occupation: template?.occupation || null,
      pain_points: template?.pain_points || [],
      desires: template?.desires || [],
      objections: template?.objections || [],
      values: [],
      interests: [],
      buying_triggers: [],
      information_sources: [],
      preferred_channels: [],
      typical_funnel_stage: template?.typical_funnel_stage || null,
    };
    
    onPersonasChange([...personas, newPersona]);
    setEditingId(newPersona.id);
    setShowTemplates(false);
  };

  const updatePersona = (id: string, updates: Partial<CustomerPersona>) => {
    onPersonasChange(personas.map(p => {
      if (p.id === id) {
        return { ...p, ...updates };
      }
      // If setting as primary, unset others
      if (updates.is_primary && p.id !== id) {
        return { ...p, is_primary: false };
      }
      return p;
    }));
  };

  const removePersona = (id: string) => {
    const remaining = personas.filter(p => p.id !== id);
    // If removed was primary, set first as primary
    if (remaining.length > 0 && !remaining.some(p => p.is_primary)) {
      remaining[0].is_primary = true;
    }
    onPersonasChange(remaining);
    if (editingId === id) setEditingId(null);
  };

  const handleAddTag = (personaId: string, field: keyof CustomerPersona, value: string) => {
    const persona = personas.find(p => p.id === personaId);
    if (!persona || !value.trim()) return;
    
    const currentArray = (persona[field] as string[]) || [];
    if (!currentArray.includes(value.trim())) {
      updatePersona(personaId, { [field]: [...currentArray, value.trim()] });
    }
  };

  const handleRemoveTag = (personaId: string, field: keyof CustomerPersona, value: string) => {
    const persona = personas.find(p => p.id === personaId);
    if (!persona) return;
    
    const currentArray = (persona[field] as string[]) || [];
    updatePersona(personaId, { [field]: currentArray.filter(v => v !== value) });
  };

  const editingPersona = editingId ? personas.find(p => p.id === editingId) : null;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Chân dung khách hàng</h2>
          <p className="text-sm text-muted-foreground">
            Định nghĩa Customer Personas giúp AI tạo nội dung phù hợp với đối tượng mục tiêu
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personas List */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Danh sách Personas</CardTitle>
                <CardDescription className="text-xs">
                  Tối đa 5 personas. Persona chính sẽ được ưu tiên khi AI tạo nội dung
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {personas.length}/5
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Persona Cards */}
            {personas.length > 0 ? (
              <div className="space-y-2">
                {personas.map((persona) => (
                  <Card 
                    key={persona.id} 
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      editingId === persona.id && "ring-2 ring-primary/30 border-primary",
                      persona.is_primary && "bg-primary/5"
                    )}
                    onClick={() => setEditingId(editingId === persona.id ? null : persona.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{persona.avatar_emoji}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm">{persona.name}</span>
                              {persona.is_primary && (
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              )}
                              {(persona as any).source_industry_persona_id && (
                                <Badge 
                                  variant="outline" 
                                  className="text-[9px] h-4 px-1 border-primary/30 text-primary"
                                >
                                  <Building2 className="w-2.5 h-2.5 mr-0.5" />
                                  Industry
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              {persona.occupation && <span>{persona.occupation}</span>}
                              {persona.age_range && (
                                <Badge variant="secondary" className="text-[9px] h-4 px-1">
                                  {persona.age_range}
                                </Badge>
                              )}
                              {persona.typical_funnel_stage && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1">
                                  {FUNNEL_STAGES.find(f => f.value === persona.typical_funnel_stage)?.label}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePersona(persona.id);
                            }}
                            disabled={disabled}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Quick stats */}
                      {(persona.pain_points.length > 0 || persona.desires.length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t">
                          {persona.pain_points.slice(0, 2).map((point, idx) => (
                            <Badge key={`p-${idx}`} variant="secondary" className="text-[9px] bg-destructive/10 text-destructive">
                              {point}
                            </Badge>
                          ))}
                          {persona.desires.slice(0, 2).map((desire, idx) => (
                            <Badge key={`d-${idx}`} variant="secondary" className="text-[9px] bg-emerald-500/10 text-emerald-600">
                              {desire}
                            </Badge>
                          ))}
                          {(persona.pain_points.length + persona.desires.length) > 4 && (
                            <Badge variant="secondary" className="text-[9px]">
                              +{persona.pain_points.length + persona.desires.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Chưa có persona nào</p>
                <p className="text-xs">Thêm persona để AI hiểu rõ đối tượng mục tiêu</p>
              </div>
            )}

            {/* Add Buttons */}
            {personas.length < 5 && (
              <div className="space-y-2 pt-2">
                {/* Import from Industry - Only show if brand has industry template */}
                {industryTemplateId && industryPersonas.length > 0 && (
                  <Dialog open={showIndustryImport} onOpenChange={setShowIndustryImport}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full h-9 border-primary/30 text-primary hover:bg-primary/5"
                        disabled={disabled || loadingIndustry}
                      >
                        <Building2 className="w-3.5 h-3.5 mr-1.5" />
                        Import từ Industry ({industryPersonas.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-primary" />
                          Import Persona từ Industry
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 mt-2">
                        <p className="text-xs text-muted-foreground">
                          Các persona được định nghĩa sẵn cho ngành. Bạn có thể tùy chỉnh sau khi import.
                        </p>
                        <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                          {industryPersonas.map((industryPersona) => {
                            const alreadyImported = personas.some(
                              p => (p as any).source_industry_persona_id === industryPersona.id
                            );
                            return (
                              <Card 
                                key={industryPersona.id}
                                className={cn(
                                  "transition-colors",
                                  alreadyImported 
                                    ? "opacity-50 cursor-not-allowed" 
                                    : "cursor-pointer hover:border-primary/50"
                                )}
                                onClick={() => {
                                  if (alreadyImported || personas.length >= 5) return;
                                  
                                  const newPersona: CustomerPersona = {
                                    id: `temp-${Date.now()}`,
                                    brand_template_id: '',
                                    name: industryPersona.name,
                                    avatar_emoji: industryPersona.avatar_emoji || '👤',
                                    is_primary: personas.length === 0,
                                    age_range: industryPersona.age_range,
                                    gender: industryPersona.gender,
                                    location: industryPersona.location,
                                    income_level: industryPersona.income_level,
                                    occupation: industryPersona.occupation,
                                    pain_points: industryPersona.pain_points || [],
                                    desires: industryPersona.desires || [],
                                    objections: industryPersona.objections || [],
                                    values: industryPersona.values || [],
                                    interests: industryPersona.interests || [],
                                    buying_triggers: industryPersona.buying_triggers || [],
                                    information_sources: industryPersona.information_sources || [],
                                    preferred_channels: industryPersona.preferred_channels || [],
                                    typical_funnel_stage: industryPersona.typical_funnel_stage,
                                    source_industry_persona_id: industryPersona.id,
                                    is_customized: false,
                                  };
                                  
                                  onPersonasChange([...personas, newPersona]);
                                  setEditingId(newPersona.id);
                                  setShowIndustryImport(false);
                                }}
                              >
                                <CardContent className="p-3 flex items-center gap-3">
                                  <span className="text-2xl">{industryPersona.avatar_emoji || '👤'}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{industryPersona.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {industryPersona.occupation || 'N/A'}
                                      {industryPersona.age_range && ` • ${industryPersona.age_range}`}
                                    </p>
                                    {industryPersona.pain_points && industryPersona.pain_points.length > 0 && (
                                      <div className="flex gap-1 mt-1">
                                        <Badge variant="secondary" className="text-[9px] truncate max-w-[120px]">
                                          {industryPersona.pain_points[0]}
                                        </Badge>
                                        {industryPersona.pain_points.length > 1 && (
                                          <Badge variant="secondary" className="text-[9px]">
                                            +{industryPersona.pain_points.length - 1}
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {alreadyImported ? (
                                    <Badge variant="secondary" className="text-[9px] shrink-0">
                                      Đã import
                                    </Badge>
                                  ) : (
                                    <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                <div className="flex gap-2">
                  <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9"
                        disabled={disabled}
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        Từ Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Chọn Template Persona</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 mt-2">
                        <p className="text-xs text-muted-foreground">
                          Đề xuất phù hợp: <Badge variant="secondary">{templateType}</Badge>
                        </p>
                        <div className="grid gap-2">
                          {PERSONA_TEMPLATES[templateType]?.map((template, idx) => (
                            <Card 
                              key={idx}
                              className="cursor-pointer hover:border-primary/50 transition-colors"
                              onClick={() => addPersona(template)}
                            >
                              <CardContent className="p-3 flex items-center gap-3">
                                <span className="text-2xl">{template.avatar_emoji}</span>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{template.name}</p>
                                  <p className="text-xs text-muted-foreground">{template.occupation}</p>
                                </div>
                                <Plus className="w-4 h-4 text-muted-foreground" />
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="flex-1 h-9"
                    onClick={() => addPersona()}
                    disabled={disabled}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Tạo mới
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Panel */}
        <Card className={cn(
          "h-fit transition-opacity",
          !editingPersona && "opacity-50 pointer-events-none"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {editingPersona ? (
                <>
                  <span className="text-xl">{editingPersona.avatar_emoji}</span>
                  {editingPersona.name}
                </>
              ) : (
                'Chọn persona để chỉnh sửa'
              )}
            </CardTitle>
          </CardHeader>
          
          {editingPersona && (
            <CardContent className="space-y-4">
              <ScrollArea className="h-[calc(100vh-400px)] min-h-[400px] pr-4">
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tên persona</Label>
                      <Input
                        value={editingPersona.name}
                        onChange={(e) => updatePersona(editingPersona.id, { name: e.target.value })}
                        className="h-9"
                        disabled={disabled}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Avatar</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="h-9 w-full justify-start gap-2">
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
                                onClick={() => updatePersona(editingPersona.id, { avatar_emoji: emoji })}
                              >
                                {emoji}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Demographics */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5 font-medium">
                      <Target className="w-3.5 h-3.5" />
                      Nhân khẩu học
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Select 
                        value={editingPersona.age_range || ''} 
                        onValueChange={(v) => updatePersona(editingPersona.id, { age_range: v })}
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-9 text-xs">
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
                        onValueChange={(v) => updatePersona(editingPersona.id, { gender: v as any })}
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-9 text-xs">
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
                        onValueChange={(v) => updatePersona(editingPersona.id, { income_level: v as any })}
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-9 text-xs">
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
                        onChange={(e) => updatePersona(editingPersona.id, { occupation: e.target.value })}
                        className="h-9 text-sm"
                        disabled={disabled}
                      />
                      <Input
                        placeholder="Khu vực..."
                        value={editingPersona.location || ''}
                        onChange={(e) => updatePersona(editingPersona.id, { location: e.target.value })}
                        className="h-9 text-sm"
                        disabled={disabled}
                      />
                    </div>
                  </div>

                  {/* Pain Points */}
                  <TagInputSection
                    label="Pain Points (Nỗi đau)"
                    icon={<Brain className="w-3.5 h-3.5" />}
                    tags={editingPersona.pain_points}
                    onAdd={(v) => handleAddTag(editingPersona.id, 'pain_points', v)}
                    onRemove={(v) => handleRemoveTag(editingPersona.id, 'pain_points', v)}
                    placeholder="VD: Thiếu thời gian, Không biết bắt đầu từ đâu..."
                    badgeClassName="bg-destructive/10 text-destructive"
                    disabled={disabled}
                  />

                  {/* Desires */}
                  <TagInputSection
                    label="Desires (Mong muốn)"
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                    tags={editingPersona.desires}
                    onAdd={(v) => handleAddTag(editingPersona.id, 'desires', v)}
                    onRemove={(v) => handleRemoveTag(editingPersona.id, 'desires', v)}
                    placeholder="VD: Tăng doanh thu, Tiết kiệm thời gian..."
                    badgeClassName="bg-emerald-500/10 text-emerald-600"
                    disabled={disabled}
                  />

                  {/* Objections */}
                  <TagInputSection
                    label="Objections (Lý do từ chối)"
                    icon={<ShoppingCart className="w-3.5 h-3.5" />}
                    tags={editingPersona.objections}
                    onAdd={(v) => handleAddTag(editingPersona.id, 'objections', v)}
                    onRemove={(v) => handleRemoveTag(editingPersona.id, 'objections', v)}
                    placeholder="VD: Giá cao, Không tin tưởng..."
                    badgeClassName="bg-amber-500/10 text-amber-600"
                    disabled={disabled}
                  />

                  {/* Values */}
                  <TagInputSection
                    label="Values (Giá trị)"
                    icon={<Heart className="w-3.5 h-3.5" />}
                    tags={editingPersona.values}
                    onAdd={(v) => handleAddTag(editingPersona.id, 'values', v)}
                    onRemove={(v) => handleRemoveTag(editingPersona.id, 'values', v)}
                    placeholder="VD: Chất lượng, Tiện lợi, Uy tín..."
                    badgeClassName="bg-pink-500/10 text-pink-600"
                    disabled={disabled}
                  />

                  {/* Interests */}
                  <TagInputSection
                    label="Interests (Sở thích)"
                    icon={<Lightbulb className="w-3.5 h-3.5" />}
                    tags={editingPersona.interests}
                    onAdd={(v) => handleAddTag(editingPersona.id, 'interests', v)}
                    onRemove={(v) => handleRemoveTag(editingPersona.id, 'interests', v)}
                    placeholder="VD: Du lịch, Công nghệ, Fitness..."
                    badgeClassName="bg-blue-500/10 text-blue-600"
                    disabled={disabled}
                  />

                  {/* Buying Triggers */}
                  <TagInputSection
                    label="Buying Triggers (Kích hoạt mua)"
                    icon={<Zap className="w-3.5 h-3.5" />}
                    tags={editingPersona.buying_triggers}
                    onAdd={(v) => handleAddTag(editingPersona.id, 'buying_triggers', v)}
                    onRemove={(v) => handleRemoveTag(editingPersona.id, 'buying_triggers', v)}
                    placeholder="VD: Khuyến mãi, Review tốt, Bạn bè giới thiệu..."
                    badgeClassName="bg-orange-500/10 text-orange-600"
                    disabled={disabled}
                  />

                  {/* Information Sources */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5 font-medium">
                      <BookOpen className="w-3.5 h-3.5" />
                      Nguồn thông tin
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {INFORMATION_SOURCE_OPTIONS.map((source) => {
                        const isSelected = editingPersona.information_sources.includes(source);
                        return (
                          <Badge
                            key={source}
                            variant={isSelected ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer text-xs transition-colors",
                              isSelected && "bg-primary"
                            )}
                            onClick={() => {
                              if (isSelected) {
                                handleRemoveTag(editingPersona.id, 'information_sources', source);
                              } else {
                                handleAddTag(editingPersona.id, 'information_sources', source);
                              }
                            }}
                          >
                            {source}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preferred Channels */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5 font-medium">
                      <Globe className="w-3.5 h-3.5" />
                      Kênh ưa thích
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {PREFERRED_CHANNEL_OPTIONS.map((channel) => {
                        const isSelected = editingPersona.preferred_channels.includes(channel.value);
                        return (
                          <Badge
                            key={channel.value}
                            variant={isSelected ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer text-xs transition-colors",
                              isSelected && "bg-primary"
                            )}
                            onClick={() => {
                              if (isSelected) {
                                handleRemoveTag(editingPersona.id, 'preferred_channels', channel.value);
                              } else {
                                handleAddTag(editingPersona.id, 'preferred_channels', channel.value);
                              }
                            }}
                          >
                            {channel.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  {/* Funnel Stage */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Giai đoạn Funnel điển hình</Label>
                    <div className="flex gap-2">
                      {FUNNEL_STAGES.map((stage) => (
                        <Button
                          key={stage.value}
                          type="button"
                          variant={editingPersona.typical_funnel_stage === stage.value ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1 h-9"
                          onClick={() => updatePersona(editingPersona.id, { typical_funnel_stage: stage.value })}
                          disabled={disabled}
                        >
                          <div className="text-center">
                            <div className="text-xs font-medium">{stage.label}</div>
                            <div className="text-[10px] opacity-70">{stage.description}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Set as Primary */}
                  {!editingPersona.is_primary && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full h-9"
                      onClick={() => updatePersona(editingPersona.id, { is_primary: true })}
                      disabled={disabled}
                    >
                      <Star className="w-3.5 h-3.5 mr-1.5" />
                      Đặt làm Persona chính
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

// Tag Input Section Component
interface TagInputSectionProps {
  label: string;
  icon: React.ReactNode;
  tags: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder: string;
  badgeClassName?: string;
  disabled?: boolean;
}

function TagInputSection({
  label,
  icon,
  tags,
  onAdd,
  onRemove,
  placeholder,
  badgeClassName,
  disabled,
}: TagInputSectionProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs flex items-center gap-1.5 font-medium">
        {icon}
        {label}
      </Label>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="h-9 text-sm flex-1"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-3"
          onClick={handleAdd}
          disabled={disabled || !inputValue.trim()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, idx) => (
            <Badge key={idx} variant="secondary" className={cn("text-xs gap-1", badgeClassName)}>
              {tag}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => onRemove(tag)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
