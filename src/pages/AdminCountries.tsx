import { useState } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { Navigate } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Globe,
  RefreshCw,
  Check,
  X,
  Flag,
  Languages,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Country {
  id: string;
  code: string;
  name: string;
  native_name: string | null;
  flag_emoji: string | null;
  default_language: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function AdminCountries() {
  const { isAdmin, isCheckingAdmin } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditData, setInlineEditData] = useState<Partial<Country>>({});
  const [formData, setFormData] = useState<Partial<Country>>({
    code: "",
    name: "",
    native_name: "",
    flag_emoji: "",
    default_language: "vi",
    is_active: true,
    sort_order: 0,
  });

  const queryClient = useQueryClient();

  // Fetch countries
  const { data: countries = [], isLoading, refetch } = useQuery({
    queryKey: ["admin_countries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as Country[];
    },
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

  // Filter countries
  const filteredCountries = countries.filter((country) => {
    const matchesSearch =
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (country.native_name?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleInlineEdit = (country: Country) => {
    setInlineEditId(country.id);
    setInlineEditData({
      name: country.name,
      native_name: country.native_name,
      flag_emoji: country.flag_emoji,
      default_language: country.default_language,
      is_active: country.is_active,
      sort_order: country.sort_order,
    });
  };

  const handleSaveInlineEdit = async (country: Country) => {
    try {
      const { error } = await supabase
        .from("countries")
        .update({
          name: inlineEditData.name || country.name,
          native_name: inlineEditData.native_name,
          flag_emoji: inlineEditData.flag_emoji,
          default_language: inlineEditData.default_language || country.default_language,
          is_active: inlineEditData.is_active ?? country.is_active,
          sort_order: inlineEditData.sort_order ?? country.sort_order,
          updated_at: new Date().toISOString(),
        })
        .eq("id", country.id);

      if (error) throw error;

      toast.success("Đã cập nhật quốc gia");
      setInlineEditId(null);
      setInlineEditData({});
      queryClient.invalidateQueries({ queryKey: ["admin_countries"] });
    } catch (error) {
      toast.error("Lỗi khi cập nhật");
      console.error(error);
    }
  };

  const handleCancelInlineEdit = () => {
    setInlineEditId(null);
    setInlineEditData({});
  };

  const handleCreate = async () => {
    try {
      if (!formData.code || !formData.name) {
        toast.error("Vui lòng nhập mã và tên quốc gia");
        return;
      }

      const { error } = await supabase.from("countries").insert({
        code: formData.code.toUpperCase(),
        name: formData.name,
        native_name: formData.native_name || null,
        flag_emoji: formData.flag_emoji || null,
        default_language: formData.default_language || "vi",
        is_active: formData.is_active ?? true,
        sort_order: formData.sort_order || 0,
      });

      if (error) throw error;

      toast.success("Đã thêm quốc gia mới");
      setIsCreateDialogOpen(false);
      setFormData({
        code: "",
        name: "",
        native_name: "",
        flag_emoji: "",
        default_language: "vi",
        is_active: true,
        sort_order: 0,
      });
      queryClient.invalidateQueries({ queryKey: ["admin_countries"] });
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi thêm quốc gia");
      console.error(error);
    }
  };

  const handleDelete = async (country: Country) => {
    if (!confirm(`Bạn có chắc muốn xóa "${country.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("countries")
        .delete()
        .eq("id", country.id);

      if (error) throw error;

      toast.success("Đã xóa quốc gia");
      queryClient.invalidateQueries({ queryKey: ["admin_countries"] });
    } catch (error) {
      toast.error("Lỗi khi xóa");
      console.error(error);
    }
  };

  const handleToggleActive = async (country: Country) => {
    try {
      const { error } = await supabase
        .from("countries")
        .update({
          is_active: !country.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", country.id);

      if (error) throw error;

      toast.success(country.is_active ? "Đã ẩn quốc gia" : "Đã kích hoạt quốc gia");
      queryClient.invalidateQueries({ queryKey: ["admin_countries"] });
    } catch (error) {
      toast.error("Lỗi khi cập nhật");
      console.error(error);
    }
  };

  const languageLabels: Record<string, string> = {
    vi: "Tiếng Việt",
    en: "English",
    zh: "中文",
    ja: "日本語",
    ko: "한국어",
    th: "ไทย",
    id: "Bahasa Indonesia",
    ms: "Bahasa Melayu",
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Flag className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Countries</h1>
            <p className="text-muted-foreground">
              Quản lý danh sách quốc gia và ngôn ngữ mặc định
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
            Thêm quốc gia
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{countries.length}</p>
                <p className="text-sm text-muted-foreground">Tổng quốc gia</p>
              </div>
              <Globe className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {countries.filter((c) => c.is_active).length}
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
                  {countries.filter((c) => !c.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">Đã ẩn</p>
              </div>
              <X className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {new Set(countries.map((c) => c.default_language)).size}
                </p>
                <p className="text-sm text-muted-foreground">Ngôn ngữ</p>
              </div>
              <Languages className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm quốc gia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filteredCountries.length === 0 ? (
            <div className="py-12 text-center">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">Chưa có quốc gia nào</p>
              <p className="text-sm text-muted-foreground mb-4">
                Thêm quốc gia đầu tiên để bắt đầu
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm quốc gia
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Flag</TableHead>
                  <TableHead className="w-[80px]">Code</TableHead>
                  <TableHead className="w-[200px]">Tên</TableHead>
                  <TableHead className="w-[200px]">Tên gốc</TableHead>
                  <TableHead className="w-[150px]">Ngôn ngữ</TableHead>
                  <TableHead className="w-[100px]">Thứ tự</TableHead>
                  <TableHead className="w-[100px]">Trạng thái</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCountries.map((country) => (
                  <TableRow key={country.id}>
                    <TableCell>
                      {inlineEditId === country.id ? (
                        <Input
                          value={inlineEditData.flag_emoji || ""}
                          onChange={(e) =>
                            setInlineEditData((prev) => ({
                              ...prev,
                              flag_emoji: e.target.value,
                            }))
                          }
                          className="h-8 w-14"
                          placeholder="🇻🇳"
                        />
                      ) : (
                        <span className="text-2xl">{country.flag_emoji || "🏳️"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {country.code}
                      </code>
                    </TableCell>
                    <TableCell>
                      {inlineEditId === country.id ? (
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
                        <span className="font-medium">{country.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {inlineEditId === country.id ? (
                        <Input
                          value={inlineEditData.native_name || ""}
                          onChange={(e) =>
                            setInlineEditData((prev) => ({
                              ...prev,
                              native_name: e.target.value,
                            }))
                          }
                          className="h-8"
                          placeholder="Việt Nam"
                        />
                      ) : (
                        <span className="text-muted-foreground">
                          {country.native_name || "-"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {inlineEditId === country.id ? (
                        <Input
                          value={inlineEditData.default_language || ""}
                          onChange={(e) =>
                            setInlineEditData((prev) => ({
                              ...prev,
                              default_language: e.target.value,
                            }))
                          }
                          className="h-8 w-20"
                          placeholder="vi"
                        />
                      ) : (
                        <Badge variant="secondary">
                          {languageLabels[country.default_language] || country.default_language}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {inlineEditId === country.id ? (
                        <Input
                          type="number"
                          value={inlineEditData.sort_order ?? 0}
                          onChange={(e) =>
                            setInlineEditData((prev) => ({
                              ...prev,
                              sort_order: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="h-8 w-16"
                        />
                      ) : (
                        <span className="text-muted-foreground">{country.sort_order}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={
                          inlineEditId === country.id
                            ? inlineEditData.is_active ?? country.is_active
                            : country.is_active
                        }
                        onCheckedChange={(checked) => {
                          if (inlineEditId === country.id) {
                            setInlineEditData((prev) => ({
                              ...prev,
                              is_active: checked,
                            }));
                          } else {
                            handleToggleActive(country);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {inlineEditId === country.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600"
                              onClick={() => handleSaveInlineEdit(country)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                              onClick={handleCancelInlineEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleInlineEdit(country)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDelete(country)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm quốc gia mới</DialogTitle>
            <DialogDescription>
              Nhập thông tin quốc gia để thêm vào hệ thống
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Mã quốc gia *</Label>
                <Input
                  id="code"
                  value={formData.code || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                  }
                  placeholder="VN"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag_emoji">Flag Emoji</Label>
                <Input
                  id="flag_emoji"
                  value={formData.flag_emoji || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, flag_emoji: e.target.value }))
                  }
                  placeholder="🇻🇳"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Tên quốc gia (Tiếng Anh) *</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Vietnam"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="native_name">Tên gốc</Label>
              <Input
                id="native_name"
                value={formData.native_name || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, native_name: e.target.value }))
                }
                placeholder="Việt Nam"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default_language">Ngôn ngữ mặc định</Label>
                <Input
                  id="default_language"
                  value={formData.default_language || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, default_language: e.target.value }))
                  }
                  placeholder="vi"
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort_order">Thứ tự sắp xếp</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order || 0}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active ?? true}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
                }
              />
              <Label htmlFor="is_active">Kích hoạt</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm quốc gia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
