import { useState } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { useIndustryTemplates, useIndustryTemplatesAdmin } from "@/hooks/useIndustryTemplates";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Globe,
  Building2,
  RefreshCw,
  Filter,
  Check,
  X,
  Save,
  Briefcase,
  Code,
  ShoppingCart,
  Users,
  Heart,
  Factory,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { IndustryTemplate, IndustryCategory, Country } from "@/hooks/useIndustryTemplates";

// Icon mapping for categories
const categoryIcons: Record<string, React.ReactNode> = {
  finance: <Briefcase className="h-4 w-4" />,
  technology: <Code className="h-4 w-4" />,
  commerce: <ShoppingCart className="h-4 w-4" />,
  services: <Users className="h-4 w-4" />,
  lifestyle: <Heart className="h-4 w-4" />,
  realestate: <Building2 className="h-4 w-4" />,
  manufacturing: <Factory className="h-4 w-4" />,
  other: <Megaphone className="h-4 w-4" />,
};

export default function AdminIndustries() {
  const { isAdmin, isCheckingAdmin } = useAdmin();
  const [selectedCountry, setSelectedCountry] = useState("VN");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingTemplate, setEditingTemplate] = useState<IndustryTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditData, setInlineEditData] = useState<Partial<IndustryTemplate>>({});
  
  const queryClient = useQueryClient();
  const { updateTemplate, updateTranslation, deleteTemplate } = useIndustryTemplatesAdmin();

  const {
    templates,
    categories,
    countries,
    isLoading,
    isLoadingCountries,
    refetch,
  } = useIndustryTemplates({
    countryCode: selectedCountry,
    languageCode: "vi",
  });

  // Loading state
  if (isCheckingAdmin) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Access control
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.brand_positioning?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || template.category_code === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const catCode = template.category_code || "other";
    if (!acc[catCode]) acc[catCode] = [];
    acc[catCode].push(template);
    return acc;
  }, {} as Record<string, IndustryTemplate[]>);

  const handleInlineEdit = (template: IndustryTemplate) => {
    setInlineEditId(template.id);
    setInlineEditData({
      name: template.name,
      short_name: template.short_name,
      brand_positioning: template.brand_positioning,
      target_audience: template.target_audience,
    });
  };

  const handleSaveInlineEdit = async (template: IndustryTemplate) => {
    try {
      // Update template basic fields
      if (inlineEditData.target_audience && inlineEditData.target_audience !== template.target_audience) {
        await updateTemplate(template.id, {
          target_audience: inlineEditData.target_audience,
        });
      }

      // Update translation
      await updateTranslation(template.id, "vi", {
        name: inlineEditData.name || template.name,
        short_name: inlineEditData.short_name || undefined,
        brand_positioning: inlineEditData.brand_positioning || undefined,
      });

      toast.success("Đã cập nhật template");
      setInlineEditId(null);
      setInlineEditData({});
      queryClient.invalidateQueries({ queryKey: ["industry_templates"] });
    } catch (error) {
      toast.error("Lỗi khi cập nhật");
      console.error(error);
    }
  };

  const handleCancelInlineEdit = () => {
    setInlineEditId(null);
    setInlineEditData({});
  };

  const handleDelete = async (template: IndustryTemplate) => {
    if (!confirm(`Bạn có chắc muốn xóa "${template.name}"?`)) return;

    try {
      await deleteTemplate(template.id);
      toast.success("Đã xóa template");
      queryClient.invalidateQueries({ queryKey: ["industry_templates"] });
    } catch (error) {
      toast.error("Lỗi khi xóa");
      console.error(error);
    }
  };

  const targetAudienceColors: Record<string, string> = {
    B2B: "bg-blue-500/10 text-blue-500",
    B2C: "bg-green-500/10 text-green-500",
    both: "bg-purple-500/10 text-purple-500",
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Industry Memory</h1>
            <p className="text-muted-foreground">
              Quản lý templates ngành theo quốc gia
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm ngành
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{templates.length}</p>
                <p className="text-sm text-muted-foreground">Tổng templates</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
              <Filter className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {templates.filter((t) => t.target_audience === "B2B").length}
                </p>
                <p className="text-sm text-muted-foreground">B2B Templates</p>
              </div>
              <Briefcase className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {templates.filter((t) => t.target_audience === "B2C").length}
                </p>
                <p className="text-sm text-muted-foreground">B2C Templates</p>
              </div>
              <Users className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Country Tabs */}
      <Tabs value={selectedCountry} onValueChange={setSelectedCountry}>
        <div className="flex items-center justify-between">
          <TabsList>
            {isLoadingCountries ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              countries.map((country) => (
                <TabsTrigger key={country.code} value={country.code} className="gap-2">
                  <span>{country.flag_emoji}</span>
                  <span>{country.code}</span>
                </TabsTrigger>
              ))
            )}
          </TabsList>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm ngành..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.code} value={cat.code}>
                    <div className="flex items-center gap-2">
                      {categoryIcons[cat.code]}
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content for each country */}
        {countries.map((country) => (
          <TabsContent key={country.code} value={country.code} className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : filteredTemplates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Globe className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-medium">Chưa có templates</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Thêm template đầu tiên cho {country.name}
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm ngành
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedTemplates).map(([catCode, catTemplates]) => {
                  const category = categories.find((c) => c.code === catCode);
                  return (
                    <Card key={catCode}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          {categoryIcons[catCode]}
                          {category?.name || catCode}
                          <Badge variant="secondary" className="ml-2">
                            {catTemplates.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[200px]">Tên ngành</TableHead>
                              <TableHead className="w-[100px]">Code</TableHead>
                              <TableHead className="w-[100px]">Target</TableHead>
                              <TableHead>Brand Positioning</TableHead>
                              <TableHead className="w-[80px]">Emoji</TableHead>
                              <TableHead className="w-[120px] text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {catTemplates.map((template) => (
                              <TableRow key={template.id}>
                                <TableCell>
                                  {inlineEditId === template.id ? (
                                    <Input
                                      value={inlineEditData.name || ""}
                                      onChange={(e) =>
                                        setInlineEditData((prev) => ({
                                          ...prev,
                                          name: e.target.value,
                                        }))
                                      }
                                      className="h-8"
                                    />
                                  ) : (
                                    <div>
                                      <p className="font-medium">{template.name}</p>
                                      {template.short_name && template.short_name !== template.name && (
                                        <p className="text-xs text-muted-foreground">
                                          {template.short_name}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                    {template.code}
                                  </code>
                                </TableCell>
                                <TableCell>
                                  {inlineEditId === template.id ? (
                                    <Select
                                      value={inlineEditData.target_audience || template.target_audience}
                                      onValueChange={(v) =>
                                        setInlineEditData((prev) => ({
                                          ...prev,
                                          target_audience: v as "B2B" | "B2C" | "both",
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-8 w-20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="B2B">B2B</SelectItem>
                                        <SelectItem value="B2C">B2C</SelectItem>
                                        <SelectItem value="both">Both</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Badge className={targetAudienceColors[template.target_audience]}>
                                      {template.target_audience}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {inlineEditId === template.id ? (
                                    <Input
                                      value={inlineEditData.brand_positioning || ""}
                                      onChange={(e) =>
                                        setInlineEditData((prev) => ({
                                          ...prev,
                                          brand_positioning: e.target.value,
                                        }))
                                      }
                                      className="h-8"
                                    />
                                  ) : (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {template.brand_positioning}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={template.brand_voice.allow_emoji ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {template.brand_voice.allow_emoji ? "✓" : "✗"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {inlineEditId === template.id ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleSaveInlineEdit(template)}
                                      >
                                        <Check className="h-4 w-4 text-green-500" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleCancelInlineEdit}
                                      >
                                        <X className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleInlineEdit(template)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingTemplate(template)}
                                      >
                                        <Save className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDelete(template)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Dialog */}
      <IndustryTemplateEditDialog
        template={editingTemplate}
        categories={categories}
        onClose={() => setEditingTemplate(null)}
        onSave={async (data) => {
          if (!editingTemplate) return;
          try {
            await updateTemplate(editingTemplate.id, {
              target_audience: data.target_audience,
              brand_voice: data.brand_voice,
              is_active: data.is_active,
            });
            await updateTranslation(editingTemplate.id, "vi", {
              name: data.name,
              short_name: data.short_name,
              brand_positioning: data.brand_positioning,
              preferred_words: data.preferred_words,
              forbidden_words: data.forbidden_words,
            });
            toast.success("Đã cập nhật template");
            setEditingTemplate(null);
            queryClient.invalidateQueries({ queryKey: ["industry_templates"] });
          } catch (error) {
            toast.error("Lỗi khi cập nhật");
            console.error(error);
          }
        }}
      />

      {/* Create Dialog */}
      <IndustryTemplateCreateDialog
        isOpen={isCreateDialogOpen}
        countries={countries}
        categories={categories}
        selectedCountry={selectedCountry}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreated={() => {
          setIsCreateDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ["industry_templates"] });
        }}
      />
    </div>
  );
}

// Edit Dialog Component
interface IndustryTemplateEditDialogProps {
  template: IndustryTemplate | null;
  categories: IndustryCategory[];
  onClose: () => void;
  onSave: (data: {
    name: string;
    short_name?: string;
    brand_positioning?: string;
    target_audience: "B2B" | "B2C" | "both";
    brand_voice: IndustryTemplate["brand_voice"];
    preferred_words: string[];
    forbidden_words: string[];
    is_active: boolean;
  }) => Promise<void>;
}

function IndustryTemplateEditDialog({
  template,
  categories,
  onClose,
  onSave,
}: IndustryTemplateEditDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    short_name: "",
    brand_positioning: "",
    target_audience: "B2B" as "B2B" | "B2C" | "both",
    tone_of_voice: [] as string[],
    formality_level: "formal",
    language_style: [] as string[],
    allow_emoji: false,
    preferred_words: "",
    forbidden_words: "",
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when template changes
  useState(() => {
    if (template) {
      setFormData({
        name: template.name,
        short_name: template.short_name || "",
        brand_positioning: template.brand_positioning || "",
        target_audience: template.target_audience,
        tone_of_voice: template.brand_voice.tone_of_voice || [],
        formality_level: template.brand_voice.formality_level || "formal",
        language_style: template.brand_voice.language_style || [],
        allow_emoji: template.brand_voice.allow_emoji || false,
        preferred_words: template.preferred_words.join(", "),
        forbidden_words: template.forbidden_words.join(", "),
        is_active: template.is_active,
      });
    }
  });

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave({
        name: formData.name,
        short_name: formData.short_name || undefined,
        brand_positioning: formData.brand_positioning || undefined,
        target_audience: formData.target_audience,
        brand_voice: {
          tone_of_voice: formData.tone_of_voice,
          formality_level: formData.formality_level,
          language_style: formData.language_style,
          allow_emoji: formData.allow_emoji,
        },
        preferred_words: formData.preferred_words.split(",").map((w) => w.trim()).filter(Boolean),
        forbidden_words: formData.forbidden_words.split(",").map((w) => w.trim()).filter(Boolean),
        is_active: formData.is_active,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={!!template} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa Industry Template</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin cho "{template.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tên ngành</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tên ngắn</Label>
              <Input
                value={formData.short_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, short_name: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Brand Positioning</Label>
            <Textarea
              value={formData.brand_positioning}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, brand_positioning: e.target.value }))
              }
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select
                value={formData.target_audience}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, target_audience: v as typeof prev.target_audience }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B2B">B2B</SelectItem>
                  <SelectItem value="B2C">B2C</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Formality Level</Label>
              <Select
                value={formData.formality_level}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, formality_level: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="semi_formal">Semi-Formal</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Cho phép Emoji</Label>
              <p className="text-sm text-muted-foreground">
                Bật nếu ngành phù hợp với emoji trong content
              </p>
            </div>
            <Switch
              checked={formData.allow_emoji}
              onCheckedChange={(v) => setFormData((prev) => ({ ...prev, allow_emoji: v }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Preferred Words (cách nhau bởi dấu phẩy)</Label>
            <Textarea
              value={formData.preferred_words}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, preferred_words: e.target.value }))
              }
              rows={2}
              placeholder="uy tín, chuyên nghiệp, tin cậy..."
            />
          </div>

          <div className="space-y-2">
            <Label>Forbidden Words (cách nhau bởi dấu phẩy)</Label>
            <Textarea
              value={formData.forbidden_words}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, forbidden_words: e.target.value }))
              }
              rows={2}
              placeholder="siêu, khủng, hot..."
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-sm text-muted-foreground">
                Template sẽ hiển thị trong danh sách chọn
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(v) => setFormData((prev) => ({ ...prev, is_active: v }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Create Dialog Component
interface IndustryTemplateCreateDialogProps {
  isOpen: boolean;
  countries: Country[];
  categories: IndustryCategory[];
  selectedCountry: string;
  onClose: () => void;
  onCreated: () => void;
}

function IndustryTemplateCreateDialog({
  isOpen,
  countries,
  categories,
  selectedCountry,
  onClose,
  onCreated,
}: IndustryTemplateCreateDialogProps) {
  const { createTemplate } = useIndustryTemplatesAdmin();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    country_code: selectedCountry,
    category_code: "",
    name: "",
    short_name: "",
    brand_positioning: "",
    target_audience: "B2B" as "B2B" | "B2C" | "both",
    formality_level: "formal",
    tone_of_voice: ["professional"] as string[],
    language_style: ["clear"] as string[],
    allow_emoji: false,
    preferred_words: "",
    forbidden_words: "",
  });

  // Reset form when dialog opens
  const resetForm = () => {
    setFormData({
      code: "",
      country_code: selectedCountry,
      category_code: "",
      name: "",
      short_name: "",
      brand_positioning: "",
      target_audience: "B2B",
      formality_level: "formal",
      tone_of_voice: ["professional"],
      language_style: ["clear"],
      allow_emoji: false,
      preferred_words: "",
      forbidden_words: "",
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error("Vui lòng nhập Code và Tên ngành");
      return;
    }

    setIsSaving(true);
    try {
      await createTemplate(
        formData.country_code,
        formData.category_code || null,
        {
          code: formData.code.trim().toLowerCase().replace(/\s+/g, "_"),
          target_audience: formData.target_audience,
          brand_voice: {
            tone_of_voice: formData.tone_of_voice,
            formality_level: formData.formality_level,
            language_style: formData.language_style,
            allow_emoji: formData.allow_emoji,
          },
        },
        [
          {
            language_code: "vi",
            name: formData.name.trim(),
            short_name: formData.short_name.trim() || undefined,
            brand_positioning: formData.brand_positioning.trim() || undefined,
            preferred_words: formData.preferred_words
              .split(",")
              .map((w) => w.trim())
              .filter(Boolean),
            forbidden_words: formData.forbidden_words
              .split(",")
              .map((w) => w.trim())
              .filter(Boolean),
          },
        ]
      );
      toast.success("Đã tạo template mới");
      resetForm();
      onCreated();
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi tạo template");
    } finally {
      setIsSaving(false);
    }
  };

  const toneOptions = [
    "professional",
    "friendly",
    "authoritative",
    "empathetic",
    "innovative",
    "traditional",
  ];

  const styleOptions = [
    "clear",
    "concise",
    "detailed",
    "technical",
    "storytelling",
    "persuasive",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Tạo Industry Template mới
          </DialogTitle>
          <DialogDescription>
            Thêm template ngành mới vào hệ thống
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Code <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, code: e.target.value }))
                }
                placeholder="tax_accounting"
              />
              <p className="text-xs text-muted-foreground">
                Mã định danh duy nhất (snake_case)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Quốc gia</Label>
              <Select
                value={formData.country_code}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, country_code: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <div className="flex items-center gap-2">
                        <span>{country.flag_emoji}</span>
                        <span>{country.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Tên ngành <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Kế toán - Thuế"
              />
            </div>
            <div className="space-y-2">
              <Label>Tên ngắn</Label>
              <Input
                value={formData.short_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, short_name: e.target.value }))
                }
                placeholder="Kế toán"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category_code}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, category_code: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.code} value={cat.code}>
                      <div className="flex items-center gap-2">
                        {categoryIcons[cat.code]}
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select
                value={formData.target_audience}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    target_audience: v as typeof prev.target_audience,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B2B">B2B</SelectItem>
                  <SelectItem value="B2C">B2C</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Brand Positioning</Label>
            <Textarea
              value={formData.brand_positioning}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  brand_positioning: e.target.value,
                }))
              }
              rows={2}
              placeholder="Mô tả định vị thương hiệu cho ngành này..."
            />
          </div>

          {/* Brand Voice Section */}
          <div className="space-y-3 pt-2 border-t">
            <h4 className="font-medium text-sm">Brand Voice</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Formality Level</Label>
                <Select
                  value={formData.formality_level}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, formality_level: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="semi_formal">Semi-Formal</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Cho phép Emoji</Label>
                  <p className="text-xs text-muted-foreground">
                    Emoji trong content
                  </p>
                </div>
                <Switch
                  checked={formData.allow_emoji}
                  onCheckedChange={(v) =>
                    setFormData((prev) => ({ ...prev, allow_emoji: v }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tone of Voice</Label>
              <div className="flex flex-wrap gap-2">
                {toneOptions.map((tone) => (
                  <Badge
                    key={tone}
                    variant={formData.tone_of_voice.includes(tone) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        tone_of_voice: prev.tone_of_voice.includes(tone)
                          ? prev.tone_of_voice.filter((t) => t !== tone)
                          : [...prev.tone_of_voice, tone],
                      }))
                    }
                  >
                    {tone}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Language Style</Label>
              <div className="flex flex-wrap gap-2">
                {styleOptions.map((style) => (
                  <Badge
                    key={style}
                    variant={formData.language_style.includes(style) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        language_style: prev.language_style.includes(style)
                          ? prev.language_style.filter((s) => s !== style)
                          : [...prev.language_style, style],
                      }))
                    }
                  >
                    {style}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Words Section */}
          <div className="space-y-3 pt-2 border-t">
            <h4 className="font-medium text-sm">Từ khóa</h4>

            <div className="space-y-2">
              <Label>Preferred Words (cách nhau bởi dấu phẩy)</Label>
              <Textarea
                value={formData.preferred_words}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    preferred_words: e.target.value,
                  }))
                }
                rows={2}
                placeholder="uy tín, chuyên nghiệp, tin cậy..."
              />
            </div>

            <div className="space-y-2">
              <Label>Forbidden Words (cách nhau bởi dấu phẩy)</Label>
              <Textarea
                value={formData.forbidden_words}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    forbidden_words: e.target.value,
                  }))
                }
                rows={2}
                placeholder="siêu, khủng, hot..."
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Tạo template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}