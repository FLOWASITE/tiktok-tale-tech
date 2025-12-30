import { useState, useEffect } from 'react';
import { Users, Link2, Star, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProductPersonaMappings } from '@/hooks/useProductPersonaMappings';
import { useCustomerPersonas } from '@/hooks/useCustomerPersonas';
import { cn } from '@/lib/utils';

interface ProductPersonaSelectorProps {
  brandTemplateId: string;
  productId: string;
  productName: string;
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
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [customPitch, setCustomPitch] = useState('');
  const [relevanceScore, setRelevanceScore] = useState(80);

  const productMappings = getPersonasForProduct(productId);
  const mappedPersonaIds = productMappings.map(m => m.persona_id);
  const unmappedPersonas = personas.filter(p => !mappedPersonaIds.includes(p.id));

  const handleAddPersona = async (personaId: string) => {
    await createMapping({
      product_id: productId,
      persona_id: personaId,
      relevance_score: 80,
      is_primary_product: false,
      custom_pitch: '',
      key_benefits: [],
      objection_handlers: [],
      preferred_content_angles: [],
      avoid_topics: [],
    });
  };

  const handleRemoveMapping = async (mappingId: string) => {
    if (confirm('Xóa liên kết này?')) {
      await deleteMapping(mappingId);
    }
  };

  const handleUpdateRelevance = async (mappingId: string, score: number) => {
    await updateMapping(mappingId, { relevance_score: score });
  };

  const handleTogglePrimary = async (mappingId: string, isPrimary: boolean) => {
    await updateMapping(mappingId, { is_primary_product: isPrimary });
  };

  const handleUpdatePitch = async (mappingId: string, pitch: string) => {
    await updateMapping(mappingId, { custom_pitch: pitch || null });
    setEditingMappingId(null);
    setCustomPitch('');
  };

  const isLoading = personasLoading || mappingsLoading;

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
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Personas phù hợp</span>
            <Badge variant="secondary" className="ml-1">{productMappings.length}</Badge>
            {isOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-3 space-y-3">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Đang tải...</div>
          ) : (
            <>
              {/* Mapped Personas */}
              {productMappings.length > 0 ? (
                <div className="space-y-2">
                  {productMappings.map(mapping => {
                    const persona = personas.find(p => p.id === mapping.persona_id);
                    if (!persona) return null;
                    
                    return (
                      <div 
                        key={mapping.id}
                        className="p-3 rounded-lg border bg-card space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{persona.avatar_emoji || '👤'}</span>
                            <div>
                              <div className="font-medium text-sm flex items-center gap-1">
                                {persona.name}
                                {mapping.is_primary_product && (
                                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {persona.occupation || persona.age_range || 'Persona'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleTogglePrimary(mapping.id, !mapping.is_primary_product)}
                              title={mapping.is_primary_product ? 'Bỏ chọn sản phẩm chính' : 'Đặt làm sản phẩm chính'}
                            >
                              <Star className={cn(
                                "h-4 w-4",
                                mapping.is_primary_product ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                              )} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveMapping(mapping.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Relevance Score */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Độ phù hợp</span>
                            <span className="font-medium">{mapping.relevance_score}%</span>
                          </div>
                          <Slider
                            value={[mapping.relevance_score]}
                            min={0}
                            max={100}
                            step={5}
                            onValueChange={([v]) => handleUpdateRelevance(mapping.id, v)}
                            className="h-1"
                          />
                        </div>

                        {/* Custom Pitch */}
                        {editingMappingId === mapping.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={customPitch}
                              onChange={e => setCustomPitch(e.target.value)}
                              placeholder={`Pitch riêng cho ${persona.name}...`}
                              rows={2}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button 
                                type="button" 
                                size="sm" 
                                onClick={() => handleUpdatePitch(mapping.id, customPitch)}
                              >
                                Lưu
                              </Button>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm"
                                onClick={() => { setEditingMappingId(null); setCustomPitch(''); }}
                              >
                                Hủy
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
                            onClick={() => {
                              setEditingMappingId(mapping.id);
                              setCustomPitch(mapping.custom_pitch || '');
                            }}
                          >
                            {mapping.custom_pitch || '+ Thêm pitch riêng cho persona này'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-2 text-center border border-dashed rounded-lg">
                  Chưa liên kết persona nào
                </div>
              )}

              {/* Add More Personas */}
              {unmappedPersonas.length > 0 && (
                <div className="pt-2 border-t">
                  <Label className="text-xs text-muted-foreground">Thêm persona</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {unmappedPersonas.map(persona => (
                      <Badge
                        key={persona.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => handleAddPersona(persona.id)}
                      >
                        <span className="mr-1">{persona.avatar_emoji || '👤'}</span>
                        {persona.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {personas.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  Chưa có persona. Thêm persona trong tab Personas để liên kết.
                </div>
              )}
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
