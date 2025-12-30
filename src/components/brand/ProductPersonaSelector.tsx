import { useState } from 'react';
import { Users, Star, Trash2, ChevronDown, ChevronUp, Sparkles, Percent, Plus, X, MessageSquare, CheckCircle2, Target, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductPersonaMappings } from '@/hooks/useProductPersonaMappings';
import { useCustomerPersonas } from '@/hooks/useCustomerPersonas';
import { cn } from '@/lib/utils';
import { ProductPersonaMappingFormData, DEFAULT_MAPPING_FORM } from '@/types/productPersonaMapping';

interface ProductPersonaSelectorProps {
  brandTemplateId: string;
  productId: string;
  productName?: string;
  organizationId?: string;
  className?: string;
}

export function ProductPersonaSelector({
  brandTemplateId,
  productId,
  productName,
  organizationId,
  className,
}: ProductPersonaSelectorProps) {
  const { personas, isLoading: personasLoading } = useCustomerPersonas({ 
    brandTemplateId, 
    enabled: !!brandTemplateId 
  });
  
  const { 
    mappings, 
    isLoading: mappingsLoading,
    createMapping,
    updateMapping,
    deleteMapping,
    getPersonasForProduct,
  } = useProductPersonaMappings({ 
    brandTemplateId, 
    productId,
    organizationId,
    enabled: !!brandTemplateId && !!productId,
  });
  
  const [isOpen, setIsOpen] = useState(true);
  const [expandedPersonaId, setExpandedPersonaId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<ProductPersonaMappingFormData | null>(null);
  const [newItem, setNewItem] = useState('');
  const [activeField, setActiveField] = useState<keyof ProductPersonaMappingFormData | null>(null);

  const productMappings = getPersonasForProduct(productId);
  const mappedPersonaIds = productMappings.map(m => m.persona_id);
  const linkedPersonaIds = mappings.map(m => m.persona_id);

  const isLoading = personasLoading || mappingsLoading;

  const handleTogglePersona = async (personaId: string, isLinked: boolean) => {
    if (isLinked) {
      const mapping = mappings.find(m => m.persona_id === personaId);
      if (mapping) {
        await deleteMapping(mapping.id);
        if (expandedPersonaId === personaId) {
          setExpandedPersonaId(null);
          setEditingForm(null);
        }
      }
    } else {
      await createMapping({
        ...DEFAULT_MAPPING_FORM,
        product_id: productId,
        persona_id: personaId,
      });
    }
  };

  const handleExpandPersona = (personaId: string) => {
    if (expandedPersonaId === personaId) {
      setExpandedPersonaId(null);
      setEditingForm(null);
    } else {
      const mapping = mappings.find(m => m.persona_id === personaId);
      if (mapping) {
        setExpandedPersonaId(personaId);
        setEditingForm({
          product_id: mapping.product_id,
          persona_id: mapping.persona_id,
          relevance_score: mapping.relevance_score,
          is_primary_product: mapping.is_primary_product,
          custom_pitch: mapping.custom_pitch || '',
          key_benefits: mapping.key_benefits || [],
          objection_handlers: mapping.objection_handlers || [],
          preferred_content_angles: mapping.preferred_content_angles || [],
          avoid_topics: mapping.avoid_topics || [],
        });
      }
    }
  };

  const handleSaveDetails = async () => {
    if (!editingForm || !expandedPersonaId) return;
    const mapping = mappings.find(m => m.persona_id === expandedPersonaId);
    if (mapping) {
      await updateMapping(mapping.id, editingForm);
      setExpandedPersonaId(null);
      setEditingForm(null);
    }
  };

  const addArrayItem = (field: keyof ProductPersonaMappingFormData) => {
    if (!newItem.trim() || !editingForm) return;
    const currentArray = (editingForm[field] as string[]) || [];
    if (!currentArray.includes(newItem.trim())) {
      setEditingForm(prev => prev && ({
        ...prev,
        [field]: [...currentArray, newItem.trim()]
      }));
    }
    setNewItem('');
  };

  const removeArrayItem = (field: keyof ProductPersonaMappingFormData, item: string) => {
    if (!editingForm) return;
    const currentArray = (editingForm[field] as string[]) || [];
    setEditingForm(prev => prev && ({
      ...prev,
      [field]: currentArray.filter(i => i !== item)
    }));
  };

  if (!brandTemplateId || !productId) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            type="button" 
            variant="ghost" 
            className="flex items-center gap-2 p-0 h-auto hover:bg-transparent w-full justify-start"
          >
            <Users className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Personas phù hợp</span>
            <Badge variant="secondary" className="ml-1 bg-purple-500/10 text-purple-600 border-0">
              {productMappings.length}
            </Badge>
            {isOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-3">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : personas.length === 0 ? (
            <div className="text-sm text-muted-foreground py-3 text-center border border-dashed rounded-lg">
              <Users className="w-4 h-4 inline-block mr-1.5" />
              Chưa có persona. Thêm persona trong tab Personas.
            </div>
          ) : (
            <ScrollArea className="max-h-[320px]">
              <div className="space-y-2 pr-2">
                {personas.map(persona => {
                  const isLinked = linkedPersonaIds.includes(persona.id);
                  const mapping = mappings.find(m => m.persona_id === persona.id);
                  const isExpanded = expandedPersonaId === persona.id;

                  return (
                    <div
                      key={persona.id}
                      className={cn(
                        "rounded-lg border transition-all duration-200",
                        isLinked 
                          ? "border-purple-500/30 bg-purple-500/5" 
                          : "border-border bg-card hover:border-muted-foreground/30",
                        isExpanded && "ring-2 ring-purple-500/30"
                      )}
                    >
                      {/* Persona Row */}
                      <div className="flex items-center gap-3 p-3">
                        <Checkbox
                          id={`persona-${persona.id}`}
                          checked={isLinked}
                          onCheckedChange={() => handleTogglePersona(persona.id, isLinked)}
                          className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{persona.avatar_emoji || '👤'}</span>
                            <label
                              htmlFor={`persona-${persona.id}`}
                              className="font-medium text-sm cursor-pointer truncate"
                            >
                              {persona.name}
                            </label>
                            {persona.is_primary && (
                              <Badge variant="secondary" className="text-[10px] h-4 bg-amber-500/10 text-amber-600 border-0">
                                Primary
                              </Badge>
                            )}
                          </div>
                          {persona.occupation && (
                            <p className="text-xs text-muted-foreground truncate ml-7">{persona.occupation}</p>
                          )}
                        </div>

                        {isLinked && mapping && (
                          <div className="flex items-center gap-2">
                            {/* Relevance Badge */}
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs gap-1 transition-colors",
                                mapping.relevance_score >= 80 && "border-emerald-500/50 text-emerald-600",
                                mapping.relevance_score >= 60 && mapping.relevance_score < 80 && "border-amber-500/50 text-amber-600",
                                mapping.relevance_score < 60 && "border-muted-foreground/50 text-muted-foreground",
                              )}
                            >
                              <Percent className="w-3 h-3" />
                              {mapping.relevance_score}
                            </Badge>

                            {mapping.is_primary_product && (
                              <Badge className="text-[10px] h-5 bg-purple-500 hover:bg-purple-600">
                                <Sparkles className="w-3 h-3 mr-0.5" />
                                Main
                              </Badge>
                            )}

                            {/* Expand Button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleExpandPersona(persona.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Expanded Details Editor */}
                      {isExpanded && editingForm && (
                        <div className="px-3 pb-3 pt-0 space-y-4 border-t border-border/50 animate-in slide-in-from-top-2 duration-200">
                          <div className="pt-3">
                            {/* Relevance Score */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Độ phù hợp</Label>
                                <span className={cn(
                                  "text-xs font-mono font-medium",
                                  editingForm.relevance_score >= 80 && "text-emerald-600",
                                  editingForm.relevance_score >= 60 && editingForm.relevance_score < 80 && "text-amber-600",
                                  editingForm.relevance_score < 60 && "text-muted-foreground",
                                )}>
                                  {editingForm.relevance_score}%
                                </span>
                              </div>
                              <Slider
                                value={[editingForm.relevance_score]}
                                onValueChange={([v]) => setEditingForm(prev => prev && ({ ...prev, relevance_score: v }))}
                                min={0}
                                max={100}
                                step={5}
                                className="w-full"
                              />
                            </div>

                            {/* Is Primary Product */}
                            <div className="flex items-center gap-2 mt-3 p-2 rounded-md bg-purple-500/5 border border-purple-500/20">
                              <Checkbox
                                id={`primary-${persona.id}`}
                                checked={editingForm.is_primary_product}
                                onCheckedChange={(checked) => 
                                  setEditingForm(prev => prev && ({ ...prev, is_primary_product: !!checked }))
                                }
                                className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                              />
                              <Label htmlFor={`primary-${persona.id}`} className="text-xs cursor-pointer flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-purple-500" />
                                Sản phẩm chính cho persona này
                              </Label>
                            </div>

                            {/* Custom Pitch */}
                            <div className="mt-3 space-y-1">
                              <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                                <MessageSquare className="w-3 h-3" />
                                Custom Pitch
                              </Label>
                              <Textarea
                                value={editingForm.custom_pitch}
                                onChange={e => setEditingForm(prev => prev && ({ ...prev, custom_pitch: e.target.value }))}
                                placeholder="Cách pitch sản phẩm này cho persona..."
                                rows={2}
                                className="text-xs resize-none"
                              />
                            </div>

                            {/* Key Benefits */}
                            <div className="mt-3 space-y-1">
                              <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                Key Benefits
                              </Label>
                              <div className="flex gap-1">
                                <Input
                                  value={activeField === 'key_benefits' ? newItem : ''}
                                  onChange={e => { setNewItem(e.target.value); setActiveField('key_benefits'); }}
                                  onFocus={() => setActiveField('key_benefits')}
                                  placeholder="Lợi ích nổi bật..."
                                  className="text-xs h-8"
                                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('key_benefits'))}
                                />
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 shrink-0"
                                  onClick={() => addArrayItem('key_benefits')}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                              {editingForm.key_benefits.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {editingForm.key_benefits.map((item, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-0 animate-in fade-in-50 duration-150">
                                      {item}
                                      <X className="w-2.5 h-2.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => removeArrayItem('key_benefits', item)} />
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Objection Handlers */}
                            <div className="mt-3 space-y-1">
                              <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                                <Target className="w-3 h-3 text-amber-500" />
                                Objection Handlers
                              </Label>
                              <div className="flex gap-1">
                                <Input
                                  value={activeField === 'objection_handlers' ? newItem : ''}
                                  onChange={e => { setNewItem(e.target.value); setActiveField('objection_handlers'); }}
                                  onFocus={() => setActiveField('objection_handlers')}
                                  placeholder="Cách xử lý phản đối..."
                                  className="text-xs h-8"
                                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('objection_handlers'))}
                                />
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 shrink-0"
                                  onClick={() => addArrayItem('objection_handlers')}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                              {editingForm.objection_handlers.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {editingForm.objection_handlers.map((item, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 border-0 animate-in fade-in-50 duration-150">
                                      {item}
                                      <X className="w-2.5 h-2.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => removeArrayItem('objection_handlers', item)} />
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Avoid Topics */}
                            <div className="mt-3 space-y-1">
                              <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                                <Ban className="w-3 h-3 text-destructive" />
                                Tránh nhắc đến
                              </Label>
                              <div className="flex gap-1">
                                <Input
                                  value={activeField === 'avoid_topics' ? newItem : ''}
                                  onChange={e => { setNewItem(e.target.value); setActiveField('avoid_topics'); }}
                                  onFocus={() => setActiveField('avoid_topics')}
                                  placeholder="Chủ đề cần tránh..."
                                  className="text-xs h-8"
                                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('avoid_topics'))}
                                />
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 shrink-0"
                                  onClick={() => addArrayItem('avoid_topics')}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                              {editingForm.avoid_topics.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {editingForm.avoid_topics.map((item, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-[10px] gap-1 bg-destructive/10 text-destructive border-0 animate-in fade-in-50 duration-150">
                                      {item}
                                      <X className="w-2.5 h-2.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => removeArrayItem('avoid_topics', item)} />
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setExpandedPersonaId(null);
                                  setEditingForm(null);
                                }}
                              >
                                Hủy
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleSaveDetails}
                                className="bg-purple-500 hover:bg-purple-600"
                              >
                                Lưu thay đổi
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
