import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
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
  DialogFooter,
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
  Download, Building2, Image, BarChart3, CheckSquare,
  FileText, ScrollText, Check, CheckCheck, HelpCircle,
  User, Settings2, Smartphone, Monitor, Laptop, GraduationCap,
  Users2, TrendingUp, ShieldCheck, Calendar, Map, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CustomerPersona,
  ContentPreferences,
  FunnelStage,
  JourneyStep,
  FUNNEL_STAGES,
  INCOME_LEVELS,
  AGE_RANGES,
  GENDER_OPTIONS,
  AVATAR_EMOJIS,
  COMMUNICATION_STYLES,
  RESPONSE_TONE_HINTS,
  CONTENT_FORMAT_OPTIONS,
  CONTENT_PREFERENCE_OPTIONS,
  getDefaultContentPreferences,
  EDUCATION_LEVELS,
  FAMILY_STATUSES,
  DEVICE_USAGES,
  TECH_SAVVINESS_LEVELS,
  BUYING_MOTIVATIONS,
  CONFIDENCE_LEVELS,
  PRIORITY_LABELS,
} from '@/types/customerPersona';
import { JourneyMapEditor } from '@/components/brand/JourneyMapEditor';
import { useIndustryPersonasForImport } from '@/hooks/useIndustryPersonas';
import { PersonaPreviewCard } from '@/components/brand/PersonaPreviewCard';
import { LocalProductPersonaLinker, LocalProductPersonaMapping } from '@/components/brand/LocalProductPersonaLinker';
import { LocalProduct } from '@/components/brand/ProductCatalogEditor';

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
  globalPackId?: string | null; // Industry Park v2 support
  localProducts?: LocalProduct[];
  localMappings?: LocalProductPersonaMapping[];
  onLocalMappingsChange?: (mappings: LocalProductPersonaMapping[]) => void;
}

export function BrandFormStepPersonas({
  personas,
  onPersonasChange,
  brandPositioning,
  brandName,
  disabled = false,
  industryTemplateId,
  globalPackId,
  localProducts = [],
  localMappings = [],
  onLocalMappingsChange,
}: BrandFormStepPersonasProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showIndustryImport, setShowIndustryImport] = useState(false);
  const [selectedIndustryPersonaIds, setSelectedIndustryPersonaIds] = useState<Set<string>>(new Set());
  const [editorTab, setEditorTab] = useState('basic');
  
  // Fetch industry personas for import (v2 priority, v1 fallback)
  const { personas: industryPersonas, isLoading: loadingIndustry } = useIndustryPersonasForImport(industryTemplateId, globalPackId);

  // Defensive guards (avoid runtime errors when upstream data is null/undefined)
  const safePersonas: CustomerPersona[] = Array.isArray(personas) ? personas : [];
  const safeIndustryPersonas = Array.isArray(industryPersonas) ? industryPersonas : [];
  const safeLocalProducts: LocalProduct[] = Array.isArray(localProducts) ? localProducts : [];
  const safeLocalMappings: LocalProductPersonaMapping[] = Array.isArray(localMappings) ? localMappings : [];
  // Helper to calculate persona completeness
  const getPersonaCompleteness = (persona: CustomerPersona): number => {
    let score = 0;
    const maxScore = 12;
    
    if (persona.name) score++;
    if (persona.age_range) score++;
    if (persona.gender) score++;
    if (persona.occupation) score++;
    if (persona.pain_points.length > 0) score++;
    if (persona.desires.length > 0) score++;
    if (persona.objections.length > 0) score++;
    if (persona.buying_triggers.length > 0) score++;
    if (persona.preferred_channels.length > 0) score++;
    if (persona.typical_funnel_stage) score++;
    if (persona.communication_style) score++;
    if (persona.content_preferences) score++;
    
    return Math.round((score / maxScore) * 100);
  };

  // Batch import with immediate use option
  const handleImportPersona = (industryPersona: any, openEditor: boolean = false) => {
    if (safePersonas.length >= 5) return;
    if (safePersonas.some(p => (p as any).source_industry_persona_id === industryPersona.id)) return;

    const newPersona: CustomerPersona = {
      id: `temp-${Date.now()}`,
      brand_template_id: '',
      name: industryPersona.name,
      avatar_emoji: industryPersona.avatar_emoji || '👤',
      is_primary: safePersonas.length === 0,
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
      communication_style: industryPersona.communication_style,
      response_tone_hints: industryPersona.response_tone_hints || [],
      content_preferences: industryPersona.content_preferences,
      persona_prompt_hints: industryPersona.persona_prompt_hints,
      source_industry_persona_id: industryPersona.id,
      is_customized: false,
    };

    onPersonasChange([...safePersonas, newPersona]);

    if (openEditor) {
      setEditingId(newPersona.id);
      setEditorTab('basic');
    }

    setShowIndustryImport(false);
  };

  // Batch import industry personas
  const handleBatchImport = () => {
    if (selectedIndustryPersonaIds.size === 0) return;

    const newPersonas: CustomerPersona[] = [];
    const remainingSlots = 5 - safePersonas.length;
    let importCount = 0;

    for (const id of selectedIndustryPersonaIds) {
      if (importCount >= remainingSlots) break;

      const industryPersona = safeIndustryPersonas.find(p => p.id === id);
      if (!industryPersona) continue;

      // Check if already imported
      if (safePersonas.some(p => (p as any).source_industry_persona_id === id)) continue;

      const newPersona: CustomerPersona = {
        id: `temp-${Date.now()}-${importCount}`,
        brand_template_id: '',
        name: industryPersona.name,
        avatar_emoji: industryPersona.avatar_emoji || '👤',
        is_primary: safePersonas.length === 0 && importCount === 0,
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
        communication_style: industryPersona.communication_style,
        response_tone_hints: industryPersona.response_tone_hints || [],
        content_preferences: industryPersona.content_preferences,
        persona_prompt_hints: industryPersona.persona_prompt_hints,
        source_industry_persona_id: industryPersona.id,
        is_customized: false,
      };

      newPersonas.push(newPersona);
      importCount++;
    }

    if (newPersonas.length > 0) {
      onPersonasChange([...safePersonas, ...newPersonas]);
      setEditingId(newPersonas[0].id);
    }

    setSelectedIndustryPersonaIds(new Set());
    setShowIndustryImport(false);
  };

  const addPersona = (template?: Partial<CustomerPersona>) => {
    if (safePersonas.length >= 5) return;

    const newPersona: CustomerPersona = {
      id: `temp-${Date.now()}`,
      brand_template_id: '',
      name: template?.name || `Persona ${safePersonas.length + 1}`,
      avatar_emoji: template?.avatar_emoji || '👤',
      is_primary: safePersonas.length === 0,
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
    
    onPersonasChange([...safePersonas, newPersona]);
    setEditingId(newPersona.id);
    setEditorTab('basic');
  };

  const updatePersona = (id: string, updates: Partial<CustomerPersona>) => {
    onPersonasChange(safePersonas.map(p => {
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
    const remaining = safePersonas.filter(p => p.id !== id);
    // If removed was primary, set first as primary
    if (remaining.length > 0 && !remaining.some(p => p.is_primary)) {
      remaining[0].is_primary = true;
    }
    onPersonasChange(remaining);
    if (editingId === id) setEditingId(null);
  };

  const handleAddTag = (personaId: string, field: keyof CustomerPersona, value: string) => {
    const persona = safePersonas.find(p => p.id === personaId);
    if (!persona || !value.trim()) return;

    const currentArray = (persona[field] as string[]) || [];
    if (!currentArray.includes(value.trim())) {
      updatePersona(personaId, { [field]: [...currentArray, value.trim()] });
    }
  };

  const handleRemoveTag = (personaId: string, field: keyof CustomerPersona, value: string) => {
    const persona = safePersonas.find(p => p.id === personaId);
    if (!persona) return;

    const currentArray = (persona[field] as string[]) || [];
    updatePersona(personaId, { [field]: currentArray.filter(v => v !== value) });
  };

  const editingPersona = editingId ? safePersonas.find(p => p.id === editingId) : null;

  return (
    <TooltipProvider>
      <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Chân dung khách hàng</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-xs">
                    Personas giúp AI tạo nội dung phù hợp với đối tượng mục tiêu. 
                    Pain points và desires sẽ được đề cập trong content để thu hút sự chú ý.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm text-muted-foreground">
              Định nghĩa Customer Personas để AI hiểu rõ đối tượng mục tiêu
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {safePersonas.length}/5
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Personas List + Preview */}
          <div className="lg:col-span-4 space-y-4">
            {/* Persona Cards List */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Danh sách Personas</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {safePersonas.length > 0 ? (
                  <div className="space-y-2">
                    {safePersonas.map((persona) => {
                      const completeness = getPersonaCompleteness(persona);
                      const isSelected = editingId === persona.id;
                      return (
                        <Card 
                          key={persona.id} 
                          className={cn(
                            "cursor-pointer transition-all hover:border-primary/50",
                            isSelected && "ring-2 ring-primary border-primary bg-primary/5",
                            persona.is_primary && !isSelected && "bg-amber-500/5"
                          )}
                          onClick={() => setEditingId(isSelected ? null : persona.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Avatar with completeness ring */}
                                <div className="relative flex-shrink-0">
                                  <span className="text-2xl">{persona.avatar_emoji}</span>
                                  <svg className="absolute -inset-1 w-10 h-10" viewBox="0 0 36 36">
                                    <circle
                                      cx="18"
                                      cy="18"
                                      r="16"
                                      fill="none"
                                      className="stroke-muted"
                                      strokeWidth="2"
                                    />
                                    <circle
                                      cx="18"
                                      cy="18"
                                      r="16"
                                      fill="none"
                                      className={cn(
                                        completeness >= 75 ? "stroke-emerald-500" :
                                        completeness >= 50 ? "stroke-amber-500" : "stroke-destructive"
                                      )}
                                      strokeWidth="2"
                                      strokeDasharray={`${completeness} ${100 - completeness}`}
                                      strokeLinecap="round"
                                      transform="rotate(-90 18 18)"
                                    />
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-sm truncate">{persona.name}</span>
                                    {persona.is_primary && (
                                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                                    )}
                                    {(persona as any).source_industry_persona_id && (
                                      <Badge 
                                        variant="outline" 
                                        className={cn(
                                          "text-[9px] h-4 px-1 flex-shrink-0",
                                          persona.is_customized 
                                            ? "border-amber-500/30 text-amber-600"
                                            : "border-primary/30 text-primary"
                                        )}
                                      >
                                        <Building2 className="w-2.5 h-2.5 mr-0.5" />
                                        {persona.is_customized ? 'Custom' : 'Industry'}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                    {persona.occupation && <span className="truncate">{persona.occupation}</span>}
                                    {persona.age_range && (
                                      <Badge variant="secondary" className="text-[9px] h-4 px-1">
                                        {persona.age_range}
                                      </Badge>
                                    )}
                                  </div>
                                  {/* Linked Products Count */}
                                  {safeLocalMappings.filter(m => m.persona_id === persona.id).length > 0 && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-1">
                                        <Package className="w-2.5 h-2.5" />
                                        {safeLocalMappings.filter(m => m.persona_id === persona.id).length} sản phẩm
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className={cn(
                                  "text-[10px] font-medium",
                                  completeness >= 75 ? "text-emerald-600" :
                                  completeness >= 50 ? "text-amber-600" : "text-destructive"
                                )}>
                                  {completeness}%
                                </span>
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
                            
                            {/* Product Linker - visible when selected */}
                            {isSelected && safeLocalProducts.length > 0 && onLocalMappingsChange && (
                              <LocalProductPersonaLinker
                                mode="persona"
                                personaId={persona.id}
                                products={safeLocalProducts}
                                personas={safePersonas}
                                mappings={safeLocalMappings}
                                onMappingsChange={onLocalMappingsChange}
                              />
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Chưa có persona nào</p>
                    <p className="text-xs">Import từ Industry hoặc tạo mới</p>
                  </div>
                )}

                {/* Add Buttons */}
                {safePersonas.length < 5 && (
                  <div className="space-y-2 pt-2 border-t">
                    {(globalPackId || industryTemplateId) && safeIndustryPersonas.length > 0 && (
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
                            Import từ Industry ({safeIndustryPersonas.length})
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Building2 className="w-5 h-5 text-primary" />
                              Import Personas từ Industry Pack
                            </DialogTitle>
                          </DialogHeader>

                          <div className="flex-1 overflow-y-auto space-y-3 py-2">
                            {/* Selection header */}
                            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg border border-primary/20">
                              <div className="flex items-center gap-2">
                                <CheckCheck className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">
                                  Đã chọn: <span className="text-primary">{selectedIndustryPersonaIds.size}</span> / {Math.min(
                                    5 - safePersonas.length,
                                    safeIndustryPersonas.filter(
                                      ip => !safePersonas.some(p => (p as any).source_industry_persona_id === ip.id)
                                    ).length
                                  )}{' '}
                                  có thể import
                                </span>
                              </div>
                              {safeIndustryPersonas.filter(
                                ip => !safePersonas.some(p => (p as any).source_industry_persona_id === ip.id)
                              ).length > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    const available = safeIndustryPersonas
                                      .filter(
                                        ip => !safePersonas.some(p => (p as any).source_industry_persona_id === ip.id)
                                      )
                                      .slice(0, 5 - safePersonas.length)
                                      .map(ip => ip.id);
                                    if (selectedIndustryPersonaIds.size === available.length) {
                                      setSelectedIndustryPersonaIds(new Set());
                                    } else {
                                      setSelectedIndustryPersonaIds(new Set(available));
                                    }
                                  }}
                                >
                                  {selectedIndustryPersonaIds.size ===
                                  safeIndustryPersonas
                                    .filter(
                                      ip => !safePersonas.some(p => (p as any).source_industry_persona_id === ip.id)
                                    )
                                    .slice(0, 5 - safePersonas.length).length
                                    ? 'Bỏ chọn tất cả'
                                    : 'Chọn tất cả'}
                                </Button>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground">
                              Còn <span className="font-semibold text-primary">{5 - safePersonas.length}</span> slot. Chọn nhiều personas rồi import cùng lúc.
                            </p>

                            <div className="grid gap-3 sm:grid-cols-2">
                              {safeIndustryPersonas.map((ip) => {
                                const alreadyImported = safePersonas.some(
                                  p => (p as any).source_industry_persona_id === ip.id
                                );
                                const isSelected = selectedIndustryPersonaIds.has(ip.id);
                                const canSelect = !alreadyImported && (isSelected || selectedIndustryPersonaIds.size < (5 - safePersonas.length));

                                return (
                                  <Card 
                                    key={ip.id}
                                    className={cn(
                                      "transition-all overflow-hidden cursor-pointer",
                                      alreadyImported && "opacity-50 cursor-not-allowed",
                                      isSelected && "ring-2 ring-primary border-primary bg-primary/5",
                                      !alreadyImported && !isSelected && "hover:border-primary/50"
                                    )}
                                    onClick={() => {
                                      if (alreadyImported || !canSelect) return;
                                      const newSet = new Set(selectedIndustryPersonaIds);
                                      if (isSelected) {
                                        newSet.delete(ip.id);
                                      } else {
                                        newSet.add(ip.id);
                                      }
                                      setSelectedIndustryPersonaIds(newSet);
                                    }}
                                  >
                                    {/* Gradient Header with checkbox */}
                                    <div className={cn(
                                      "h-2 bg-gradient-to-r",
                                      isSelected 
                                        ? "from-primary via-primary/70 to-primary/30" 
                                        : "from-primary/30 via-primary/20 to-transparent"
                                    )} />
                                    
                                    <CardContent className="p-4 space-y-3">
                                      {/* Avatar + Info + Checkbox */}
                                      <div className="flex items-start gap-3">
                                        <div className="relative">
                                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-2xl border">
                                            {ip.avatar_emoji || '👤'}
                                          </div>
                                          {!alreadyImported && (
                                            <div className={cn(
                                              "absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                              isSelected 
                                                ? "bg-primary border-primary text-primary-foreground" 
                                                : "bg-background border-muted-foreground/30"
                                            )}>
                                              {isSelected && <Check className="w-3 h-3" />}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-semibold text-sm truncate">{ip.name}</h4>
                                          <p className="text-xs text-muted-foreground truncate">
                                            {ip.occupation || 'N/A'} {ip.age_range && `• ${ip.age_range}`}
                                          </p>
                                          {alreadyImported && (
                                            <Badge variant="secondary" className="text-[9px] mt-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                              <Check className="w-2.5 h-2.5 mr-0.5" />
                                              Đã import
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Quote / Hints */}
                                      {ip.persona_prompt_hints && (
                                        <p className="text-xs text-muted-foreground italic line-clamp-2 bg-muted/30 rounded p-2 border-l-2 border-primary/30">
                                          "{ip.persona_prompt_hints}"
                                        </p>
                                      )}
                                      
                                      {/* Pain Points Preview */}
                                      {ip.pain_points && ip.pain_points.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {ip.pain_points.slice(0, 3).map((point, idx) => (
                                            <Badge key={idx} variant="secondary" className="text-[9px] bg-destructive/10 text-destructive">
                                              {point}
                                            </Badge>
                                          ))}
                                          {ip.pain_points.length > 3 && (
                                            <Badge variant="secondary" className="text-[9px]">
                                              +{ip.pain_points.length - 3}
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* Communication Style */}
                                      {ip.communication_style && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <MessageCircle className="w-3 h-3" />
                                          <span>
                                            {COMMUNICATION_STYLES.find(c => c.value === ip.communication_style)?.label || ip.communication_style}
                                          </span>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                          
                          <DialogFooter className="border-t pt-3 flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedIndustryPersonaIds(new Set());
                                setShowIndustryImport(false);
                              }}
                            >
                              Đóng
                            </Button>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              className="gap-1.5"
                              disabled={selectedIndustryPersonaIds.size === 0}
                              onClick={handleBatchImport}
                            >
                              <Download className="w-4 h-4" />
                              Import {selectedIndustryPersonaIds.size > 0 ? `(${selectedIndustryPersonaIds.size})` : ''} Personas
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}

                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="w-full h-9"
                      onClick={() => addPersona()}
                      disabled={disabled}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Tạo mới
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview Card - Shows selected persona */}
            {editingPersona && (
              <div className="hidden lg:block">
                <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Preview (cập nhật realtime)
                </div>
                <PersonaPreviewCard persona={editingPersona} />
              </div>
            )}
          </div>

          {/* Right: Editor Panel with Tabs */}
          <div className="lg:col-span-7">
            <Card className={cn(
              "h-fit transition-opacity",
              !editingPersona && "opacity-50 pointer-events-none"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {editingPersona ? (
                      <>
                        <span className="text-xl">{editingPersona.avatar_emoji}</span>
                        <span className="truncate">{editingPersona.name}</span>
                        {editingPersona.is_primary && (
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400 flex-shrink-0" />
                        )}
                      </>
                    ) : (
                      'Chọn persona để chỉnh sửa'
                    )}
                  </CardTitle>
                  {editingPersona && !editingPersona.is_primary && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => updatePersona(editingPersona.id, { is_primary: true })}
                      disabled={disabled}
                    >
                      <Star className="w-3 h-3" />
                      Đặt làm chính
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              {editingPersona && (
                <CardContent className="pt-0">
                  <Tabs value={editorTab} onValueChange={setEditorTab} className="w-full">
                    <TabsList className="w-full h-9 grid grid-cols-5">
                      <TabsTrigger value="basic" className="text-xs gap-1">
                        <User className="w-3 h-3" />
                        <span className="hidden sm:inline">Cơ bản</span>
                      </TabsTrigger>
                      <TabsTrigger value="psycho" className="text-xs gap-1">
                        <Brain className="w-3 h-3" />
                        <span className="hidden sm:inline">Tâm lý</span>
                      </TabsTrigger>
                      <TabsTrigger value="behavior" className="text-xs gap-1">
                        <ShoppingCart className="w-3 h-3" />
                        <span className="hidden sm:inline">Hành vi</span>
                      </TabsTrigger>
                      <TabsTrigger value="ai" className="text-xs gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span className="hidden sm:inline">AI</span>
                      </TabsTrigger>
                      <TabsTrigger value="advanced" className="text-xs gap-1">
                        <Settings2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Nâng cao</span>
                      </TabsTrigger>
                    </TabsList>

                    <ScrollArea className="h-[calc(100vh-450px)] min-h-[350px] mt-4">
                      {/* Basic Tab */}
                      <TabsContent value="basic" className="mt-0 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Tên persona *</Label>
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

                        {/* Extended Demographics */}
                        <div className="space-y-2">
                          <Label className="text-xs flex items-center gap-1.5 font-medium">
                            <GraduationCap className="w-3.5 h-3.5" />
                            Thông tin mở rộng
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Select 
                              value={editingPersona.education_level || ''} 
                              onValueChange={(v) => updatePersona(editingPersona.id, { education_level: v as any, is_customized: true })}
                              disabled={disabled}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Học vấn" />
                              </SelectTrigger>
                              <SelectContent>
                                {EDUCATION_LEVELS.map((level) => (
                                  <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select 
                              value={editingPersona.family_status || ''} 
                              onValueChange={(v) => updatePersona(editingPersona.id, { family_status: v as any, is_customized: true })}
                              disabled={disabled}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Tình trạng GĐ" />
                              </SelectTrigger>
                              <SelectContent>
                                {FAMILY_STATUSES.map((status) => (
                                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Select 
                              value={editingPersona.device_usage || ''} 
                              onValueChange={(v) => updatePersona(editingPersona.id, { device_usage: v as any, is_customized: true })}
                              disabled={disabled}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Thiết bị" />
                              </SelectTrigger>
                              <SelectContent>
                                {DEVICE_USAGES.map((device) => (
                                  <SelectItem key={device.value} value={device.value}>
                                    <div className="flex items-center gap-1.5">
                                      {device.value === 'mobile-first' && <Smartphone className="w-3 h-3" />}
                                      {device.value === 'desktop-first' && <Monitor className="w-3 h-3" />}
                                      {device.value === 'balanced' && <Laptop className="w-3 h-3" />}
                                      {device.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select 
                              value={editingPersona.tech_savviness || ''} 
                              onValueChange={(v) => updatePersona(editingPersona.id, { tech_savviness: v as any, is_customized: true })}
                              disabled={disabled}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Mức độ tech" />
                              </SelectTrigger>
                              <SelectContent>
                                {TECH_SAVVINESS_LEVELS.map((level) => (
                                  <SelectItem key={level.value} value={level.value}>
                                    <div className="flex flex-col">
                                      <span>{level.label}</span>
                                      <span className="text-[10px] text-muted-foreground">{level.description}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
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
                      </TabsContent>

                      {/* Psychographics Tab */}
                      <TabsContent value="psycho" className="mt-0 space-y-4">
                        <TagInputSection
                          label="Pain Points (Nỗi đau)"
                          icon={<Brain className="w-3.5 h-3.5" />}
                          tags={editingPersona.pain_points}
                          onAdd={(v) => handleAddTag(editingPersona.id, 'pain_points', v)}
                          onRemove={(v) => handleRemoveTag(editingPersona.id, 'pain_points', v)}
                          placeholder="VD: Thiếu thời gian..."
                          badgeClassName="bg-destructive/10 text-destructive"
                          disabled={disabled}
                          hint="AI sẽ đề cập đến pain points này để thu hút sự chú ý"
                        />

                        <TagInputSection
                          label="Desires (Mong muốn)"
                          icon={<Sparkles className="w-3.5 h-3.5" />}
                          tags={editingPersona.desires}
                          onAdd={(v) => handleAddTag(editingPersona.id, 'desires', v)}
                          onRemove={(v) => handleRemoveTag(editingPersona.id, 'desires', v)}
                          placeholder="VD: Tăng doanh thu..."
                          badgeClassName="bg-emerald-500/10 text-emerald-600"
                          disabled={disabled}
                        />

                        <TagInputSection
                          label="Objections (Lý do từ chối)"
                          icon={<ShoppingCart className="w-3.5 h-3.5" />}
                          tags={editingPersona.objections}
                          onAdd={(v) => handleAddTag(editingPersona.id, 'objections', v)}
                          onRemove={(v) => handleRemoveTag(editingPersona.id, 'objections', v)}
                          placeholder="VD: Giá cao..."
                          badgeClassName="bg-amber-500/10 text-amber-600"
                          disabled={disabled}
                          hint="AI sẽ chuẩn bị cách xử lý các objection này trong content"
                        />

                        <TagInputSection
                          label="Values (Giá trị)"
                          icon={<Heart className="w-3.5 h-3.5" />}
                          tags={editingPersona.values}
                          onAdd={(v) => handleAddTag(editingPersona.id, 'values', v)}
                          onRemove={(v) => handleRemoveTag(editingPersona.id, 'values', v)}
                          placeholder="VD: Chất lượng, Uy tín..."
                          badgeClassName="bg-pink-500/10 text-pink-600"
                          disabled={disabled}
                        />

                        <TagInputSection
                          label="Interests (Sở thích)"
                          icon={<Lightbulb className="w-3.5 h-3.5" />}
                          tags={editingPersona.interests}
                          onAdd={(v) => handleAddTag(editingPersona.id, 'interests', v)}
                          onRemove={(v) => handleRemoveTag(editingPersona.id, 'interests', v)}
                          placeholder="VD: Du lịch, Công nghệ..."
                          badgeClassName="bg-blue-500/10 text-blue-600"
                          disabled={disabled}
                        />
                      </TabsContent>

                      {/* Behavior Tab */}
                      <TabsContent value="behavior" className="mt-0 space-y-4">
                        <TagInputSection
                          label="Buying Triggers (Kích hoạt mua)"
                          icon={<Zap className="w-3.5 h-3.5" />}
                          tags={editingPersona.buying_triggers}
                          onAdd={(v) => handleAddTag(editingPersona.id, 'buying_triggers', v)}
                          onRemove={(v) => handleRemoveTag(editingPersona.id, 'buying_triggers', v)}
                          placeholder="VD: Khuyến mãi, Review tốt..."
                          badgeClassName="bg-orange-500/10 text-orange-600"
                          disabled={disabled}
                        />

                        {/* Buying Motivations */}
                        <div className="space-y-2">
                          <Label className="text-xs flex items-center gap-1.5 font-medium">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Động lực mua hàng
                          </Label>
                          <div className="flex flex-wrap gap-1.5">
                            {BUYING_MOTIVATIONS.map((motivation) => {
                              const motivations = editingPersona.buying_motivation || [];
                              const isSelected = motivations.includes(motivation.value);
                              return (
                                <Badge
                                  key={motivation.value}
                                  variant={isSelected ? "default" : "outline"}
                                  className={cn(
                                    "cursor-pointer text-xs transition-colors",
                                    isSelected && "bg-primary"
                                  )}
                                  onClick={() => {
                                    if (disabled) return;
                                    const current = editingPersona.buying_motivation || [];
                                    if (isSelected) {
                                      updatePersona(editingPersona.id, { 
                                        buying_motivation: current.filter(m => m !== motivation.value),
                                        is_customized: true
                                      });
                                    } else {
                                      updatePersona(editingPersona.id, { 
                                        buying_motivation: [...current, motivation.value],
                                        is_customized: true
                                      });
                                    }
                                  }}
                                >
                                  {motivation.label}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>

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
                      </TabsContent>

                      {/* AI Enhancement Tab */}
                      <TabsContent value="ai" className="mt-0 space-y-4">
                        {/* Communication Style */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Phong cách giao tiếp</Label>
                          <Select
                            value={editingPersona.communication_style || ''}
                            onValueChange={(value) => updatePersona(editingPersona.id, { 
                              communication_style: value,
                              is_customized: true 
                            })}
                            disabled={disabled}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Chọn phong cách..." />
                            </SelectTrigger>
                            <SelectContent>
                              {COMMUNICATION_STYLES.map((style) => (
                                <SelectItem key={style.value} value={style.value}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{style.label}</span>
                                    <span className="text-xs text-muted-foreground">{style.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Response Tone Hints */}
                        <div className="space-y-2">
                          <Label className="text-xs flex items-center gap-1.5 font-medium">
                            <MessageCircle className="w-3.5 h-3.5" />
                            Tone gợi ý
                          </Label>
                          <div className="flex flex-wrap gap-1.5">
                            {RESPONSE_TONE_HINTS.map((tone) => {
                              const tones = editingPersona.response_tone_hints || [];
                              const isSelected = tones.includes(tone.value);
                              return (
                                <Badge
                                  key={tone.value}
                                  variant={isSelected ? "default" : "outline"}
                                  className={cn(
                                    "cursor-pointer text-xs transition-colors",
                                    isSelected && "bg-primary"
                                  )}
                                  onClick={() => {
                                    if (disabled) return;
                                    const currentTones = editingPersona.response_tone_hints || [];
                                    if (isSelected) {
                                      updatePersona(editingPersona.id, { 
                                        response_tone_hints: currentTones.filter(t => t !== tone.value),
                                        is_customized: true
                                      });
                                    } else {
                                      updatePersona(editingPersona.id, { 
                                        response_tone_hints: [...currentTones, tone.value],
                                        is_customized: true
                                      });
                                    }
                                  }}
                                >
                                  {tone.label}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>

                        {/* Persona Prompt Hints */}
                        <div className="space-y-2">
                          <Label className="text-xs flex items-center gap-1.5 font-medium">
                            <Sparkles className="w-3.5 h-3.5" />
                            Gợi ý cho AI (Quote)
                          </Label>
                          <Input
                            value={editingPersona.persona_prompt_hints || ''}
                            onChange={(e) => updatePersona(editingPersona.id, { 
                              persona_prompt_hints: e.target.value,
                              is_customized: true
                            })}
                            placeholder="VD: Tập trung vào ROI và tiết kiệm thời gian..."
                            className="h-9 text-sm"
                            disabled={disabled}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Quote hoặc hướng dẫn cụ thể cho AI khi tạo nội dung cho persona này
                          </p>
                        </div>

                        {/* Content Preferences */}
                        <div className="space-y-3 border-t pt-4">
                          <Label className="text-xs flex items-center gap-1.5 font-medium">
                            <FileText className="w-3.5 h-3.5" />
                            Sở thích nội dung
                          </Label>
                          
                          {/* Format preference */}
                          <div className="space-y-2">
                            <Label className="text-[10px] text-muted-foreground">Độ dài nội dung ưa thích</Label>
                            <div className="flex gap-2">
                              {CONTENT_FORMAT_OPTIONS.map((format) => {
                                const currentPrefs = editingPersona.content_preferences || getDefaultContentPreferences();
                                const isSelected = currentPrefs.format === format.value;
                                return (
                                  <Button
                                    key={format.value}
                                    type="button"
                                    variant={isSelected ? 'default' : 'outline'}
                                    size="sm"
                                    className="flex-1 h-9"
                                    onClick={() => updatePersona(editingPersona.id, { 
                                      content_preferences: { ...currentPrefs, format: format.value as 'short' | 'medium' | 'long' },
                                      is_customized: true
                                    })}
                                    disabled={disabled}
                                  >
                                    <div className="text-center">
                                      <div className="text-xs font-medium">{format.label}</div>
                                      <div className="text-[9px] opacity-70">{format.description}</div>
                                    </div>
                                  </Button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Content preference toggles */}
                          <div className="grid grid-cols-1 gap-2">
                            {CONTENT_PREFERENCE_OPTIONS.map((pref) => {
                              const currentPrefs = editingPersona.content_preferences || getDefaultContentPreferences();
                              const isEnabled = currentPrefs[pref.key as keyof ContentPreferences] === true;
                              
                              const IconComponent = {
                                'Image': Image,
                                'BookOpen': BookOpen,
                                'BarChart3': BarChart3,
                                'Heart': Heart,
                                'CheckSquare': CheckSquare,
                              }[pref.icon] || FileText;
                              
                              return (
                                <div 
                                  key={pref.key}
                                  className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
                                >
                                  <div className="flex items-center gap-2">
                                    <IconComponent className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-xs font-medium">{pref.label}</p>
                                      <p className="text-[10px] text-muted-foreground">{pref.description}</p>
                                    </div>
                                  </div>
                                  <Switch
                                    checked={isEnabled}
                                    onCheckedChange={(checked) => {
                                      updatePersona(editingPersona.id, {
                                        content_preferences: { ...currentPrefs, [pref.key]: checked },
                                        is_customized: true
                                      });
                                    }}
                                    disabled={disabled}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </TabsContent>

                      {/* Advanced Tab (NEW) */}
                      <TabsContent value="advanced" className="mt-0 space-y-4">
                        {/* Priority & Segment */}
                        <div className="space-y-3">
                          <Label className="text-xs flex items-center gap-1.5 font-medium">
                            <Star className="w-3.5 h-3.5" />
                            Độ ưu tiên & Segment
                          </Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground">Độ ưu tiên (1-5)</Label>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((score) => (
                                  <Button
                                    key={score}
                                    type="button"
                                    variant={(editingPersona.priority_score || 3) >= score ? 'default' : 'outline'}
                                    size="sm"
                                    className="flex-1 h-8 p-0"
                                    onClick={() => updatePersona(editingPersona.id, { priority_score: score, is_customized: true })}
                                    disabled={disabled}
                                  >
                                    <Star className={cn(
                                      "w-3 h-3",
                                      (editingPersona.priority_score || 3) >= score && "fill-current"
                                    )} />
                                  </Button>
                                ))}
                              </div>
                              <p className="text-[10px] text-muted-foreground text-center">
                                {PRIORITY_LABELS.find(p => p.value === (editingPersona.priority_score || 3))?.label || 'Trung bình'}
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground">Segment size (%)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={5}
                                value={editingPersona.segment_size || ''}
                                onChange={(e) => updatePersona(editingPersona.id, { 
                                  segment_size: e.target.value ? Number(e.target.value) : undefined,
                                  is_customized: true 
                                })}
                                placeholder="VD: 35"
                                className="h-8 text-sm"
                                disabled={disabled}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Journey Map */}
                        <div className="space-y-2 border-t pt-4">
                          <Label className="text-xs flex items-center gap-1.5 font-medium">
                            <Map className="w-3.5 h-3.5" />
                            Customer Journey Map
                          </Label>
                          <JourneyMapEditor
                            value={editingPersona.journey_map || []}
                            onChange={(map) => updatePersona(editingPersona.id, { journey_map: map, is_customized: true })}
                          />
                        </div>

                        {/* Data Source & Confidence */}
                        <div className="space-y-3 border-t pt-4">
                          <Label className="text-xs flex items-center gap-1.5 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Nguồn dữ liệu & Độ tin cậy
                          </Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground">Mức độ tin cậy</Label>
                              <Select 
                                value={editingPersona.confidence_level || ''} 
                                onValueChange={(v) => updatePersona(editingPersona.id, { confidence_level: v as any, is_customized: true })}
                                disabled={disabled}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Chọn..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {CONFIDENCE_LEVELS.map((level) => (
                                    <SelectItem key={level.value} value={level.value}>
                                      <div className="flex flex-col">
                                        <span>{level.label}</span>
                                        <span className="text-[10px] text-muted-foreground">{level.description}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground">Ngày nghiên cứu</Label>
                              <Input
                                type="date"
                                value={editingPersona.last_researched_date || ''}
                                onChange={(e) => updatePersona(editingPersona.id, { 
                                  last_researched_date: e.target.value || undefined,
                                  is_customized: true 
                                })}
                                className="h-8 text-xs"
                                disabled={disabled}
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] text-muted-foreground">Nguồn dữ liệu</Label>
                            <Input
                              value={editingPersona.data_source || ''}
                              onChange={(e) => updatePersona(editingPersona.id, { data_source: e.target.value, is_customized: true })}
                              placeholder="VD: Survey 100 KH, Google Analytics, Phỏng vấn..."
                              className="h-8 text-sm"
                              disabled={disabled}
                            />
                          </div>
                        </div>

                        {/* Visual Customization */}
                        <div className="space-y-3 border-t pt-4">
                          <Label className="text-xs flex items-center gap-1.5 font-medium">
                            <Image className="w-3.5 h-3.5" />
                            Tùy chỉnh giao diện
                          </Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground">Avatar URL (tùy chọn)</Label>
                              <Input
                                value={editingPersona.avatar_url || ''}
                                onChange={(e) => updatePersona(editingPersona.id, { avatar_url: e.target.value || undefined, is_customized: true })}
                                placeholder="https://..."
                                className="h-8 text-xs"
                                disabled={disabled}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground">Màu theme</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="color"
                                  value={editingPersona.color_theme || '#6366f1'}
                                  onChange={(e) => updatePersona(editingPersona.id, { color_theme: e.target.value, is_customized: true })}
                                  className="h-8 w-12 p-1 cursor-pointer"
                                  disabled={disabled}
                                />
                                <Input
                                  value={editingPersona.color_theme || ''}
                                  onChange={(e) => updatePersona(editingPersona.id, { color_theme: e.target.value || undefined, is_customized: true })}
                                  placeholder="#6366f1"
                                  className="h-8 text-xs flex-1"
                                  disabled={disabled}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </ScrollArea>
                  </Tabs>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
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
  hint?: string;
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
  hint,
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
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1.5 font-medium">
          {icon}
          {label}
        </Label>
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs">{hint}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
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
