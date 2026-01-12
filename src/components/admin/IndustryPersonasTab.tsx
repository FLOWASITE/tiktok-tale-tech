/**
 * IndustryPersonasTab - Admin component for managing industry personas in v2.1
 */

import { useState } from 'react';
import { useIndustryPersonasV2, useDeleteIndustryPersonaV2, useCreateIndustryPersonaV2 } from '@/hooks/useIndustryPersonasV2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Users,
  Plus,
  Trash2,
  Edit,
  User,
  Briefcase,
  Target,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import type { IndustryPersonaV2 } from '@/types/industryPersonaV2';
import {
  GENDER_OPTIONS,
  INCOME_LEVEL_OPTIONS,
  COMMUNICATION_STYLES_V2,
  PRICE_SENSITIVITY_OPTIONS,
  createEmptyIndustryPersonaV2,
} from '@/types/industryPersonaV2';

interface IndustryPersonasTabProps {
  globalPackId: string;
  industryCode: string;
  targetAudience: string;
}

export function IndustryPersonasTab({ globalPackId, industryCode, targetAudience }: IndustryPersonasTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState(() => createEmptyIndustryPersonaV2(globalPackId));

  const { data: personas, isLoading, refetch } = useIndustryPersonasV2(globalPackId);
  const { mutate: createPersona, isPending: isCreating } = useCreateIndustryPersonaV2();
  const { mutate: deletePersona, isPending: isDeleting } = useDeleteIndustryPersonaV2();

  const handleCreate = () => {
    createPersona(
      {
        ...formData,
        global_pack_id: globalPackId,
        name: formData.name || 'New Persona',
        description: formData.description || '',
        avatar_url: formData.avatar_url || '',
        is_active: true,
        sort_order: personas?.length || 0,
        age_range: formData.age_range || '',
        gender: formData.gender || '',
        income_level: formData.income_level || '',
        education_level: formData.education_level || '',
        occupation: formData.occupation || '',
        location_type: formData.location_type || '',
        family_status: formData.family_status || '',
        lifestyle: formData.lifestyle || '',
        price_sensitivity: formData.price_sensitivity || '',
        purchase_frequency: formData.purchase_frequency || '',
        tech_savviness: formData.tech_savviness || '',
        communication_style: formData.communication_style || '',
        values: formData.values || [],
        interests: formData.interests || [],
        personality_traits: formData.personality_traits || [],
        buying_motivation: formData.buying_motivation || [],
        decision_factors: formData.decision_factors || [],
        preferred_channels: formData.preferred_channels || [],
        social_platforms: formData.social_platforms || [],
        content_consumption: formData.content_consumption || [],
        response_tone_hints: formData.response_tone_hints || [],
        pain_points: formData.pain_points || [],
        goals: formData.goals || [],
        objections: formData.objections || [],
        device_usage: formData.device_usage || {},
        content_preferences: formData.content_preferences || { format: 'medium', practical: true },
        journey_stages: formData.journey_stages || [],
        country_variants: formData.country_variants || {},
      },
      {
        onSuccess: () => {
          toast.success('Đã tạo persona mới');
          setIsCreateOpen(false);
          setFormData(createEmptyIndustryPersonaV2(globalPackId));
          refetch();
        },
        onError: () => {
          toast.error('Lỗi khi tạo persona');
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    deletePersona(id, {
      onSuccess: () => {
        toast.success('Đã xóa persona');
        setDeleteId(null);
        refetch();
      },
      onError: () => {
        toast.error('Lỗi khi xóa persona');
      },
    });
  };

  const updateFormField = <K extends keyof typeof formData>(
    key: K,
    value: typeof formData[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Target Personas ({personas?.length || 0})
            </CardTitle>
            <CardDescription className="mt-1">
              Personas cho {industryCode} • {targetAudience}
            </CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Thêm Persona
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tạo Target Persona mới</DialogTitle>
                <DialogDescription>
                  Thêm persona cho {industryCode}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tên persona *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => updateFormField('name', e.target.value)}
                      placeholder="VD: Chủ doanh nghiệp SME"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nghề nghiệp</Label>
                    <Input
                      value={formData.occupation || ''}
                      onChange={(e) => updateFormField('occupation', e.target.value)}
                      placeholder="VD: CEO, Giám đốc"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => updateFormField('description', e.target.value)}
                    placeholder="Mô tả chi tiết về persona..."
                    rows={2}
                  />
                </div>

                {/* Demographics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Độ tuổi</Label>
                    <Input
                      value={formData.age_range || ''}
                      onChange={(e) => updateFormField('age_range', e.target.value)}
                      placeholder="25-34"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Giới tính</Label>
                    <Select
                      value={formData.gender || ''}
                      onValueChange={(v) => updateFormField('gender', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn..." />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Thu nhập</Label>
                    <Select
                      value={formData.income_level || ''}
                      onValueChange={(v) => updateFormField('income_level', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn..." />
                      </SelectTrigger>
                      <SelectContent>
                        {INCOME_LEVEL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* AI Enhancement */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phong cách giao tiếp</Label>
                    <Select
                      value={formData.communication_style || ''}
                      onValueChange={(v) => updateFormField('communication_style', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn..." />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMUNICATION_STYLES_V2.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label} - {opt.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Độ nhạy giá</Label>
                    <Select
                      value={formData.price_sensitivity || ''}
                      onValueChange={(v) => updateFormField('price_sensitivity', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PRICE_SENSITIVITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Pain Points & Goals */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pain Points (mỗi dòng 1 item)</Label>
                    <Textarea
                      value={formData.pain_points?.join('\n') || ''}
                      onChange={(e) => updateFormField('pain_points', e.target.value.split('\n').filter(Boolean))}
                      placeholder="Thiếu thời gian&#10;Chi phí cao&#10;Khó tìm nhà cung cấp"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Goals (mỗi dòng 1 item)</Label>
                    <Textarea
                      value={formData.goals?.join('\n') || ''}
                      onChange={(e) => updateFormField('goals', e.target.value.split('\n').filter(Boolean))}
                      placeholder="Tăng doanh thu&#10;Tiết kiệm chi phí&#10;Mở rộng thị trường"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreate} disabled={isCreating || !formData.name}>
                  {isCreating ? 'Đang tạo...' : 'Tạo Persona'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {personas && personas.length > 0 ? (
          <ScrollArea className="max-h-[400px]">
            <Accordion type="multiple" className="w-full">
              {personas.map((persona) => (
                <AccordionItem key={persona.id} value={persona.id} className="border-b last:border-0">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">{persona.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {persona.occupation || 'Chưa có nghề nghiệp'} • {persona.age_range || '—'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {persona.communication_style && (
                          <Badge variant="secondary" className="text-xs">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {persona.communication_style}
                          </Badge>
                        )}
                        {persona.income_level && (
                          <Badge variant="outline" className="text-xs">
                            {INCOME_LEVEL_OPTIONS.find(o => o.value === persona.income_level)?.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      {/* Description */}
                      {persona.description && (
                        <p className="text-sm text-muted-foreground">{persona.description}</p>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Target className="h-3 w-3" />
                            <span>Pain Points</span>
                          </div>
                          <p className="font-medium">{persona.pain_points?.length || 0}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Sparkles className="h-3 w-3" />
                            <span>Goals</span>
                          </div>
                          <p className="font-medium">{persona.goals?.length || 0}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Briefcase className="h-3 w-3" />
                            <span>Objections</span>
                          </div>
                          <p className="font-medium">{persona.objections?.length || 0}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>Channels</span>
                          </div>
                          <p className="font-medium">{persona.preferred_channels?.length || 0}</p>
                        </div>
                      </div>

                      {/* Pain Points Preview */}
                      {persona.pain_points && persona.pain_points.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Pain Points:</p>
                          <div className="flex flex-wrap gap-1">
                            {persona.pain_points.slice(0, 5).map((point, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {point}
                              </Badge>
                            ))}
                            {persona.pain_points.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{persona.pain_points.length - 5}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button variant="outline" size="sm" disabled>
                          <Edit className="h-4 w-4 mr-1" />
                          Sửa
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteId(persona.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Xóa
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        ) : (
          <div className="py-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-4">Chưa có persona nào</p>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Tạo Persona đầu tiên
            </Button>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Persona sẽ bị ẩn đi (soft delete). Bạn có thể khôi phục sau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
