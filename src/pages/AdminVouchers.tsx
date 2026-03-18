import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Ticket, Loader2, Copy } from "lucide-react";
import { format } from "date-fns";

interface VoucherFormData {
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_uses: number | null;
  applicable_plans: string[];
  min_amount: number;
  expires_at: string;
}

const PLAN_OPTIONS = [
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "business", label: "Business" },
  { value: "enterprise", label: "Enterprise" },
];

const defaultForm: VoucherFormData = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: 10,
  max_uses: null,
  applicable_plans: [],
  min_amount: 0,
  expires_at: "",
};

export default function AdminVouchers() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<VoucherFormData>(defaultForm);

  const { data: vouchers, isLoading } = useQuery({
    queryKey: ["admin-vouchers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: VoucherFormData) => {
      const { error } = await supabase.from("vouchers").insert({
        code: formData.code.toUpperCase().trim(),
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        max_uses: formData.max_uses || null,
        applicable_plans: formData.applicable_plans.length > 0 ? formData.applicable_plans : null,
        min_amount: formData.min_amount || 0,
        expires_at: formData.expires_at || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tạo voucher thành công");
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
      setCreateOpen(false);
      setForm(defaultForm);
    },
    onError: (err: any) => {
      toast.error("Lỗi: " + (err.message || "Không thể tạo voucher"));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("vouchers")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] });
    },
  });

  const formatPrice = (v: number) => new Intl.NumberFormat("vi-VN").format(v);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Đã copy mã: " + code);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="h-6 w-6" />
            Quản lý Voucher
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tạo và quản lý mã giảm giá cho gói subscription
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo voucher
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Giảm giá</TableHead>
              <TableHead>Gói áp dụng</TableHead>
              <TableHead>Đã dùng</TableHead>
              <TableHead>Hết hạn</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : vouchers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Chưa có voucher nào
                </TableCell>
              </TableRow>
            ) : (
              vouchers?.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-semibold text-sm bg-muted px-2 py-0.5 rounded">{v.code}</code>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyCode(v.code)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    {v.description && <p className="text-xs text-muted-foreground mt-0.5">{v.description}</p>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {v.discount_type === "percentage" ? `${v.discount_value}%` : `${formatPrice(v.discount_value)}₫`}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {v.applicable_plans ? (
                      <div className="flex gap-1 flex-wrap">
                        {v.applicable_plans.map((p: string) => (
                          <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Tất cả</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="tabular-nums">
                      {v.used_count}/{v.max_uses ?? "∞"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {v.expires_at ? (
                      <span className="text-xs">
                        {format(new Date(v.expires_at), "dd/MM/yyyy")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Không</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={v.is_active}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: v.id, is_active: checked })}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo voucher mới</DialogTitle>
            <DialogDescription>Nhập thông tin mã giảm giá</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Mã voucher *</Label>
              <Input
                placeholder="VD: SALE50, WELCOME"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="font-mono mt-1"
              />
            </div>
            <div>
              <Label>Mô tả</Label>
              <Input
                placeholder="VD: Giảm 50% cho khách mới"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Loại giảm giá</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(v) => setForm({ ...form, discount_type: v as "percentage" | "fixed" })}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Phần trăm (%)</SelectItem>
                    <SelectItem value="fixed">Số tiền (₫)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Giá trị *</Label>
                <Input
                  type="number"
                  placeholder={form.discount_type === "percentage" ? "10" : "50000"}
                  value={form.discount_value || ""}
                  onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tối đa lượt dùng</Label>
                <Input
                  type="number"
                  placeholder="Không giới hạn"
                  value={form.max_uses ?? ""}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value ? Number(e.target.value) : null })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Đơn hàng tối thiểu (₫)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.min_amount || ""}
                  onChange={(e) => setForm({ ...form, min_amount: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Gói áp dụng</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PLAN_OPTIONS.map((p) => (
                  <Badge
                    key={p.value}
                    variant={form.applicable_plans.includes(p.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setForm({
                        ...form,
                        applicable_plans: form.applicable_plans.includes(p.value)
                          ? form.applicable_plans.filter((x) => x !== p.value)
                          : [...form.applicable_plans, p.value],
                      });
                    }}
                  >
                    {p.label}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Không chọn = áp dụng tất cả</p>
            </div>
            <div>
              <Label>Hết hạn</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Để trống = không hết hạn</p>
            </div>
            <Button
              className="w-full"
              onClick={() => createMutation.mutate(form)}
              disabled={!form.code.trim() || !form.discount_value || createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Tạo voucher
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
