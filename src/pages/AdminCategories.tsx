import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  X,
  Layers,
  Briefcase,
  Code,
  ShoppingCart,
  Users,
  Heart,
  Building2,
  Factory,
  Megaphone,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface IndustryCategory {
  id: string;
  code: string;
  icon_name: string;
  color: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface CategoryTranslation {
  id: string;
  category_id: string;
  language_code: string;
  name: string;
  description: string | null;
}

// Icon mapping for preview
const iconComponents: Record<string, React.ReactNode> = {
  Briefcase: <Briefcase className="h-4 w-4" />,
  Code: <Code className="h-4 w-4" />,
  ShoppingCart: <ShoppingCart className="h-4 w-4" />,
  Users: <Users className="h-4 w-4" />,
  Heart: <Heart className="h-4 w-4" />,
  Building2: <Building2 className="h-4 w-4" />,
  Factory: <Factory className="h-4 w-4" />,
  Megaphone: <Megaphone className="h-4 w-4" />,
  Layers: <Layers className="h-4 w-4" />,
};

const availableIcons = [
  "Briefcase",
  "Code",
  "ShoppingCart",
  "Users",
  "Heart",
  "Building2",
  "Factory",
  "Megaphone",
  "Layers",
];

const defaultColors = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
];

export default function AdminCategories() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditData, setInlineEditData] = useState<Partial<IndustryCategory & { name: string; description: string }>>({});
  const [formData, setFormData] = useState({
    code: "",
    icon_name: "Briefcase",
    color: "#6366f1",
    is_active: true,
    sort_order: 0,
    name: "",
    description: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const queryClient = useQueryClient();

  // Fetch categories with translations
  const { data: categoriesData = [], isLoading, refetch } = useQuery({
    queryKey: ["admin_categories"],
    queryFn: async () => {
      const { data: categories, error } = await supabase
        .from("industry_categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      // Fetch translations for each category
      const { data: translations, error: transError } = await supabase
        .from("industry_category_translations")
        .select("*")
        .eq("language_code", "vi");

      if (transError) throw transError;

      // Merge categories with translations
      return (categories || []).map((cat) => {
        const trans = translations?.find((t) => t.category_id === cat.id);
        return {
          ...cat,
          name: trans?.name || cat.code,
          description: trans?.description || null,
        };
      });
    },
  });

  // Filter categories
  const filteredCategories = categoriesData.filter((category) => {
    const matchesSearch =
      category.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleInlineEdit = (category: typeof categoriesData[0]) => {
    setInlineEditId(category.id);
    setInlineEditData({
      name: category.name,
      description: category.description,
      icon_name: category.icon_name,
      color: category.color,
      is_active: category.is_active,
      sort_order: category.sort_order,
    });
  };

  const handleSaveInlineEdit = async (category: typeof categoriesData[0]) => {
    try {
      // Update category
      const { error } = await supabase
        .from("industry_categories")
        .update({
          icon_name: inlineEditData.icon_name || category.icon_name,
          color: inlineEditData.color || category.color,
          is_active: inlineEditData.is_active ?? category.is_active,
          sort_order: inlineEditData.sort_order ?? category.sort_order,
          updated_at: new Date().toISOString(),
        })
        .eq("id", category.id);

      if (error) throw error;

      // Update translation
      const { error: transError } = await supabase
        .from("industry_category_translations")
        .upsert({
          category_id: category.id,
          language_code: "vi",
          name: inlineEditData.name || category.name,
          description: inlineEditData.description || null,
          updated_at: new Date().toISOString(),
        });

      if (transError) throw transError;

      toast.success("Đã cập nhật category");
      setInlineEditId(null);
      setInlineEditData({});
      queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
      queryClient.invalidateQueries({ queryKey: ["industry_categories"] });
    } catch (error) {
      toast.error("Lỗi khi cập nhật");
      console.error(error);
    }
  };

  const handleCancelInlineEdit = () => {
    setInlineEditId(null);
    setInlineEditData({});
  };

  const handleDelete = async (category: typeof categoriesData[0]) => {
    if (!confirm(`Bạn có chắc muốn xóa category "${category.name}"?`)) return;

    try {
      // Delete translations first
      await supabase
        .from("industry_category_translations")
        .delete()
        .eq("category_id", category.id);

      // Delete category
      const { error } = await supabase
        .from("industry_categories")
        .delete()
        .eq("id", category.id);

      if (error) throw error;

      toast.success("Đã xóa category");
      queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
      queryClient.invalidateQueries({ queryKey: ["industry_categories"] });
    } catch (error) {
      toast.error("Lỗi khi xóa");
      console.error(error);
    }
  };

  const handleCreate = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error("Vui lòng nhập Code và Tên");
      return;
    }

    setIsSaving(true);
    try {
      // Create category
      const { data: newCategory, error } = await supabase
        .from("industry_categories")
        .insert({
          code: formData.code.trim().toLowerCase(),
          icon_name: formData.icon_name,
          color: formData.color,
          is_active: formData.is_active,
          sort_order: formData.sort_order,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Create translation
      const { error: transError } = await supabase
        .from("industry_category_translations")
        .insert({
          category_id: newCategory.id,
          language_code: "vi",
          name: formData.name.trim(),
          description: formData.description.trim() || null,
        });

      if (transError) throw transError;

      toast.success("Đã tạo category mới");
      setIsCreateDialogOpen(false);
      setFormData({
        code: "",
        icon_name: "Briefcase",
        color: "#6366f1",
        is_active: true,
        sort_order: 0,
        name: "",
        description: "",
      });
      queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
      queryClient.invalidateQueries({ queryKey: ["industry_categories"] });
    } catch (error) {
      toast.error("Lỗi khi tạo category");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Industry Categories</h1>
            <p className="text-muted-foreground">
              Quản lý danh mục ngành nghề
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
            Thêm category
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{categoriesData.length}</p>
                <p className="text-sm text-muted-foreground">Tổng categories</p>
              </div>
              <Layers className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {categoriesData.filter((c) => c.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">Đang hoạt động</p>
              </div>
              <Check className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {categoriesData.filter((c) => !c.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">Không hoạt động</p>
              </div>
              <X className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-12 text-center">
              <Layers className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">Chưa có category</p>
              <p className="text-sm text-muted-foreground mb-4">
                Thêm category đầu tiên
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm category
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Icon</TableHead>
                  <TableHead className="w-[120px]">Code</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className="w-[80px]">Color</TableHead>
                  <TableHead className="w-[80px]">Order</TableHead>
                  <TableHead className="w-[80px]">Active</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      {inlineEditId === category.id ? (
                        <Select
                          value={inlineEditData.icon_name || category.icon_name}
                          onValueChange={(v) =>
                            setInlineEditData((prev) => ({ ...prev, icon_name: v }))
                          }
                        >
                          <SelectTrigger className="h-8 w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableIcons.map((icon) => (
                              <SelectItem key={icon} value={icon}>
                                <div className="flex items-center gap-2">
                                  {iconComponents[icon]}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div
                          className="p-1.5 rounded"
                          style={{ backgroundColor: category.color || "#6366f1" }}
                        >
                          <span className="text-white">
                            {iconComponents[category.icon_name] || <Layers className="h-4 w-4" />}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {category.code}
                      </code>
                    </TableCell>
                    <TableCell>
                      {inlineEditId === category.id ? (
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
                        <span className="font-medium">{category.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {inlineEditId === category.id ? (
                        <Input
                          value={inlineEditData.description || ""}
                          onChange={(e) =>
                            setInlineEditData((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          className="h-8"
                          placeholder="Mô tả..."
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {category.description || "-"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {inlineEditId === category.id ? (
                        <Input
                          type="color"
                          value={inlineEditData.color || category.color || "#6366f1"}
                          onChange={(e) =>
                            setInlineEditData((prev) => ({
                              ...prev,
                              color: e.target.value,
                            }))
                          }
                          className="h-8 w-12 p-0.5"
                        />
                      ) : (
                        <div
                          className="h-6 w-6 rounded border"
                          style={{ backgroundColor: category.color || "#6366f1" }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {inlineEditId === category.id ? (
                        <Input
                          type="number"
                          value={inlineEditData.sort_order ?? category.sort_order}
                          onChange={(e) =>
                            setInlineEditData((prev) => ({
                              ...prev,
                              sort_order: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="h-8 w-16"
                        />
                      ) : (
                        <span className="text-sm">{category.sort_order}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {inlineEditId === category.id ? (
                        <Switch
                          checked={inlineEditData.is_active ?? category.is_active}
                          onCheckedChange={(v) =>
                            setInlineEditData((prev) => ({ ...prev, is_active: v }))
                          }
                        />
                      ) : (
                        <Badge
                          variant={category.is_active ? "default" : "secondary"}
                        >
                          {category.is_active ? "Active" : "Inactive"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {inlineEditId === category.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleSaveInlineEdit(category)}
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={handleCancelInlineEdit}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleInlineEdit(category)}
                          >
                            <Palette className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(category)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Tạo Category mới
            </DialogTitle>
            <DialogDescription>
              Thêm danh mục ngành nghề mới
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
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
                  placeholder="finance"
                />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={formData.icon_name}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, icon_name: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIcons.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        <div className="flex items-center gap-2">
                          {iconComponents[icon]}
                          <span>{icon}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Tên <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Tài chính - Ngân hàng"
              />
            </div>

            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Mô tả ngắn..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-1">
                  {defaultColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-6 w-6 rounded border-2 ${
                        formData.color === color
                          ? "border-foreground"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, color }))
                      }
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sort_order: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Category sẽ hiển thị trong danh sách
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) =>
                  setFormData((prev) => ({ ...prev, is_active: v }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo category
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
