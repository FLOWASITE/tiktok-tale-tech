import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  Users, ChevronDown, Plus, Trash2, Star, X, 
  Target, Brain, ShoppingCart, Sparkles 
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

interface CustomerPersonaEditorProps {
  personas: CustomerPersona[];
  onPersonasChange: (personas: CustomerPersona[]) => void;
  brandPositioning?: string;
  disabled?: boolean;
}

export function CustomerPersonaEditor({
  personas,
  onPersonasChange,
  brandPositioning,
  disabled = false,
}: CustomerPersonaEditorProps) {
  const [isOpen, setIsOpen] = useState(personas.length > 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

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
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">👥 Chân dung khách hàng</span>
                <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">
                  Tùy chọn
                </Badge>
                {personas.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {personas.length} persona{personas.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground text-left">Giúp AI hiểu pain points, desires của khách hàng</p>
            </div>
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )} />
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="p-4 pt-3 space-y-3">
          {/* Persona Cards */}
          {personas.length > 0 && (
            <div className="grid gap-2">
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
                  <CardHeader className="p-3 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{persona.avatar_emoji}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm">{persona.name}</span>
                            {persona.is_primary && (
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {persona.occupation && <span>{persona.occupation}</span>}
                            {persona.typical_funnel_stage && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1">
                                {FUNNEL_STAGES.find(f => f.value === persona.typical_funnel_stage)?.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePersona(persona.id);
                        }}
                        disabled={disabled}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  {/* Quick preview of pain points */}
                  {persona.pain_points.length > 0 && editingId !== persona.id && (
                    <CardContent className="p-3 pt-0">
                      <div className="flex flex-wrap gap-1">
                        {persona.pain_points.slice(0, 3).map((point, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[10px] bg-destructive/10 text-destructive">
                            {point}
                          </Badge>
                        ))}
                        {persona.pain_points.length > 3 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{persona.pain_points.length - 3}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Edit Panel */}
          {editingPersona && (
            <Card className="border-primary/30 bg-background">
              <CardContent className="p-4 space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tên persona</Label>
                    <Input
                      value={editingPersona.name}
                      onChange={(e) => updatePersona(editingPersona.id, { name: e.target.value })}
                      className="h-8 text-sm"
                      disabled={disabled}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Avatar</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-8 w-full justify-start gap-2">
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
                  <Label className="text-xs flex items-center gap-1.5">
                    <Target className="w-3 h-3" />
                    Nhân khẩu học
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Select 
                      value={editingPersona.age_range || ''} 
                      onValueChange={(v) => updatePersona(editingPersona.id, { age_range: v })}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-8 text-xs">
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
                      <SelectTrigger className="h-8 text-xs">
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
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Thu nhập" />
                      </SelectTrigger>
                      <SelectContent>
                        {INCOME_LEVELS.map((i) => (
                          <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    placeholder="Nghề nghiệp..."
                    value={editingPersona.occupation || ''}
                    onChange={(e) => updatePersona(editingPersona.id, { occupation: e.target.value })}
                    className="h-8 text-sm"
                    disabled={disabled}
                  />
                </div>

                {/* Psychographics - Pain Points */}
                <TagInputSection
                  label="Pain Points"
                  icon={<Brain className="w-3 h-3" />}
                  tags={editingPersona.pain_points}
                  onAdd={(v) => handleAddTag(editingPersona.id, 'pain_points', v)}
                  onRemove={(v) => handleRemoveTag(editingPersona.id, 'pain_points', v)}
                  placeholder="VD: Thiếu thời gian..."
                  badgeClassName="bg-destructive/10 text-destructive"
                  disabled={disabled}
                />

                {/* Desires */}
                <TagInputSection
                  label="Desires (Mong muốn)"
                  icon={<Sparkles className="w-3 h-3" />}
                  tags={editingPersona.desires}
                  onAdd={(v) => handleAddTag(editingPersona.id, 'desires', v)}
                  onRemove={(v) => handleRemoveTag(editingPersona.id, 'desires', v)}
                  placeholder="VD: Tăng doanh thu..."
                  badgeClassName="bg-emerald-500/10 text-emerald-600"
                  disabled={disabled}
                />

                {/* Objections */}
                <TagInputSection
                  label="Objections (Lý do từ chối)"
                  icon={<ShoppingCart className="w-3 h-3" />}
                  tags={editingPersona.objections}
                  onAdd={(v) => handleAddTag(editingPersona.id, 'objections', v)}
                  onRemove={(v) => handleRemoveTag(editingPersona.id, 'objections', v)}
                  placeholder="VD: Giá cao..."
                  badgeClassName="bg-amber-500/10 text-amber-600"
                  disabled={disabled}
                />

                {/* Funnel Stage */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Giai đoạn Funnel điển hình</Label>
                  <div className="flex gap-2">
                    {FUNNEL_STAGES.map((stage) => (
                      <Button
                        key={stage.value}
                        type="button"
                        variant={editingPersona.typical_funnel_stage === stage.value ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => updatePersona(editingPersona.id, { typical_funnel_stage: stage.value })}
                        disabled={disabled}
                      >
                        {stage.label}
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
                    className="w-full h-8 text-xs"
                    onClick={() => updatePersona(editingPersona.id, { is_primary: true })}
                    disabled={disabled}
                  >
                    <Star className="w-3 h-3 mr-1.5" />
                    Đặt làm Persona chính
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Add Buttons */}
          {personas.length < 5 && (
            <div className="flex gap-2">
              <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    disabled={disabled}
                  >
                    <Sparkles className="w-3 h-3 mr-1.5" />
                    Dùng template {templateType}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Chọn Persona Template</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {PERSONA_TEMPLATES[templateType]?.map((template, idx) => (
                      <Card 
                        key={idx}
                        className="cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => addPersona(template)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-xl">{template.avatar_emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{template.name}</div>
                              <div className="text-xs text-muted-foreground">{template.occupation}</div>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {template.pain_points?.slice(0, 2).map((p, i) => (
                                  <Badge key={i} variant="secondary" className="text-[9px]">{p}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => addPersona()}
                disabled={disabled}
              >
                <Plus className="w-3 h-3 mr-1" />
                Tạo mới
              </Button>
            </div>
          )}

          {personas.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Thêm Customer Personas để AI gợi ý topics phù hợp hơn với đối tượng khách hàng
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Helper component for tag input sections
function TagInputSection({
  label,
  icon,
  tags,
  onAdd,
  onRemove,
  placeholder,
  badgeClassName,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  tags: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder: string;
  badgeClassName?: string;
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        onAdd(inputValue.trim());
        setInputValue('');
      }
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1.5">
        {icon}
        {label}
      </Label>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, idx) => (
            <Badge key={idx} variant="secondary" className={cn("text-[10px] gap-1", badgeClassName)}>
              {tag}
              <button
                type="button"
                onClick={() => onRemove(tag)}
                className="hover:text-destructive"
                disabled={disabled}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-7 text-xs"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => {
            if (inputValue.trim()) {
              onAdd(inputValue.trim());
              setInputValue('');
            }
          }}
          disabled={disabled}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
