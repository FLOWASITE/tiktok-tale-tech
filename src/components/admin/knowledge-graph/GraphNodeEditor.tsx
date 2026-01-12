// ============================================
// Graph Node Editor
// CRUD operations for knowledge graph nodes
// ============================================

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateKnowledgeNode,
  useUpdateKnowledgeNode,
  useDeleteKnowledgeNode,
  useCreateKnowledgeEdge,
} from "@/hooks/useKnowledgeGraph";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Save,
  Trash2,
  Link2,
  Building2,
  Scale,
  FileText,
  Lightbulb,
  Users,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import type {
  KnowledgeNode,
  KnowledgeNodeType,
  KnowledgeEdgeType,
  CreateNodeInput,
  CreateEdgeInput,
} from "@/types/knowledgeGraph";

// ============================================
// Constants
// ============================================

const NODE_TYPES: { value: KnowledgeNodeType; label: string; icon: React.ElementType }[] = [
  { value: "industry", label: "Ngành", icon: Building2 },
  { value: "regulation", label: "Quy định", icon: Scale },
  { value: "term", label: "Thuật ngữ", icon: FileText },
  { value: "concept", label: "Khái niệm", icon: Lightbulb },
  { value: "persona", label: "Persona", icon: Users },
  { value: "jurisdiction", label: "Khu vực pháp lý", icon: Globe },
];

const EDGE_TYPES: { value: KnowledgeEdgeType; label: string }[] = [
  { value: "related_to", label: "Liên quan đến" },
  { value: "parent_of", label: "Là cha của" },
  { value: "regulated_by", label: "Được điều chỉnh bởi" },
  { value: "uses_term", label: "Sử dụng thuật ngữ" },
  { value: "shares_audience", label: "Cùng đối tượng" },
  { value: "competes_with", label: "Cạnh tranh với" },
  { value: "requires_compliance", label: "Yêu cầu tuân thủ" },
  { value: "derived_from", label: "Kế thừa từ" },
  { value: "applies_to", label: "Áp dụng cho" },
];

// ============================================
// Form Schemas
// ============================================

const nodeFormSchema = z.object({
  node_type: z.enum(["industry", "regulation", "term", "concept", "persona", "jurisdiction"]),
  node_key: z.string().min(1, "Node key là bắt buộc").max(100),
  display_name_vi: z.string().min(1, "Tên tiếng Việt là bắt buộc"),
  display_name_en: z.string().optional(),
  description_vi: z.string().optional(),
  description_en: z.string().optional(),
  properties_json: z.string().optional(),
});

const edgeFormSchema = z.object({
  target_node_id: z.string().min(1, "Node đích là bắt buộc"),
  edge_type: z.enum([
    "related_to", "parent_of", "regulated_by", "uses_term",
    "shares_audience", "competes_with", "requires_compliance",
    "derived_from", "applies_to"
  ]),
  weight: z.number().min(0).max(1).default(1),
  is_bidirectional: z.boolean().default(false),
});

type NodeFormData = z.infer<typeof nodeFormSchema>;
type EdgeFormData = z.infer<typeof edgeFormSchema>;

// ============================================
// Node Editor Dialog
// ============================================

interface NodeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node?: KnowledgeNode | null;
  globalPackId?: string;
  onSuccess?: () => void;
}

export function NodeEditorDialog({
  open,
  onOpenChange,
  node,
  globalPackId,
  onSuccess,
}: NodeEditorDialogProps) {
  const isEditing = !!node;
  const [activeTab, setActiveTab] = useState("basic");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const createNode = useCreateKnowledgeNode();
  const updateNode = useUpdateKnowledgeNode();
  const deleteNode = useDeleteKnowledgeNode();

  const form = useForm<NodeFormData>({
    resolver: zodResolver(nodeFormSchema),
    defaultValues: {
      node_type: "industry",
      node_key: "",
      display_name_vi: "",
      display_name_en: "",
      description_vi: "",
      description_en: "",
      properties_json: "{}",
    },
  });

  // Reset form when node changes
  useEffect(() => {
    if (node) {
      form.reset({
        node_type: node.node_type,
        node_key: node.node_key,
        display_name_vi: node.display_name?.vi || "",
        display_name_en: node.display_name?.en || "",
        description_vi: node.description?.vi || "",
        description_en: node.description?.en || "",
        properties_json: JSON.stringify(node.properties || {}, null, 2),
      });
    } else {
      form.reset({
        node_type: "industry",
        node_key: "",
        display_name_vi: "",
        display_name_en: "",
        description_vi: "",
        description_en: "",
        properties_json: "{}",
      });
    }
  }, [node, form]);

  const onSubmit = async (data: NodeFormData) => {
    try {
      let properties = {};
      if (data.properties_json) {
        try {
          properties = JSON.parse(data.properties_json);
        } catch {
          toast.error("Properties JSON không hợp lệ");
          return;
        }
      }

      const input: CreateNodeInput = {
        global_pack_id: globalPackId,
        node_type: data.node_type,
        node_key: data.node_key,
        display_name: {
          vi: data.display_name_vi,
          en: data.display_name_en || undefined,
        },
        description: {
          vi: data.description_vi || undefined,
          en: data.description_en || undefined,
        },
        properties,
      };

      if (isEditing && node) {
        await updateNode.mutateAsync({
          nodeId: node.id,
          updates: {
            display_name: input.display_name,
            description: input.description,
            properties: input.properties,
          },
        });
        toast.success("Đã cập nhật node");
      } else {
        await createNode.mutateAsync(input);
        toast.success("Đã tạo node mới");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Lỗi: " + (error as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!node) return;
    try {
      await deleteNode.mutateAsync(node.id);
      toast.success("Đã xóa node");
      setDeleteDialogOpen(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Lỗi khi xóa: " + (error as Error).message);
    }
  };

  const isPending = createNode.isPending || updateNode.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Chỉnh sửa Node" : "Tạo Node mới"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Cập nhật thông tin node trong Knowledge Graph"
                : "Thêm một node mới vào Knowledge Graph"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="basic">Cơ bản</TabsTrigger>
                  <TabsTrigger value="description">Mô tả</TabsTrigger>
                  <TabsTrigger value="properties">Thuộc tính</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="node_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loại Node</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isEditing}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {NODE_TYPES.map((type) => {
                              const Icon = type.icon;
                              return (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    {type.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="node_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Node Key</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="vd: healthcare, gdpr_compliance"
                            disabled={isEditing}
                          />
                        </FormControl>
                        <FormDescription>
                          Định danh duy nhất, không chứa khoảng trắng
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="display_name_vi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tên (Tiếng Việt)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Tên hiển thị" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="display_name_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tên (English)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Display name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="description" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="description_vi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mô tả (Tiếng Việt)</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={4} placeholder="Mô tả chi tiết..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mô tả (English)</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={4} placeholder="Detailed description..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="properties" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="properties_json"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Properties (JSON)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={10}
                            className="font-mono text-sm"
                            placeholder='{"key": "value"}'
                          />
                        </FormControl>
                        <FormDescription>
                          Các thuộc tính bổ sung dưới dạng JSON
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6 gap-2">
                {isEditing && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Xóa
                  </Button>
                )}
                <div className="flex-1" />
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isPending}>
                  <Save className="h-4 w-4 mr-1" />
                  {isPending ? "Đang lưu..." : isEditing ? "Cập nhật" : "Tạo mới"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Node sẽ bị vô hiệu hóa (soft delete). Các edges liên quan vẫn được giữ lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================
// Edge Editor Dialog
// ============================================

interface EdgeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceNode: KnowledgeNode;
  availableTargets: KnowledgeNode[];
  onSuccess?: () => void;
}

export function EdgeEditorDialog({
  open,
  onOpenChange,
  sourceNode,
  availableTargets,
  onSuccess,
}: EdgeEditorDialogProps) {
  const createEdge = useCreateKnowledgeEdge();

  const form = useForm<EdgeFormData>({
    resolver: zodResolver(edgeFormSchema),
    defaultValues: {
      target_node_id: "",
      edge_type: "related_to",
      weight: 1,
      is_bidirectional: false,
    },
  });

  const onSubmit = async (data: EdgeFormData) => {
    try {
      const input: CreateEdgeInput = {
        source_node_id: sourceNode.id,
        target_node_id: data.target_node_id,
        edge_type: data.edge_type,
        weight: data.weight,
        is_bidirectional: data.is_bidirectional,
      };

      await createEdge.mutateAsync(input);
      toast.success("Đã tạo liên kết");
      onOpenChange(false);
      onSuccess?.();
      form.reset();
    } catch (error) {
      toast.error("Lỗi: " + (error as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo liên kết mới</DialogTitle>
          <DialogDescription>
            Từ: <Badge variant="secondary">{sourceNode.display_name?.vi || sourceNode.node_key}</Badge>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="target_node_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Node đích</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn node đích" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTargets
                        .filter((n) => n.id !== sourceNode.id)
                        .map((node) => (
                          <SelectItem key={node.id} value={node.id}>
                            {node.display_name?.vi || node.node_key}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="edge_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại liên kết</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EDGE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trọng số (0-1)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={field.value}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Mức độ quan trọng của liên kết
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={createEdge.isPending}>
                <Link2 className="h-4 w-4 mr-1" />
                {createEdge.isPending ? "Đang tạo..." : "Tạo liên kết"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Create Node Button
// ============================================

interface CreateNodeButtonProps {
  globalPackId?: string;
  onSuccess?: () => void;
}

export function CreateNodeButton({ globalPackId, onSuccess }: CreateNodeButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Tạo Node
      </Button>
      <NodeEditorDialog
        open={open}
        onOpenChange={setOpen}
        globalPackId={globalPackId}
        onSuccess={onSuccess}
      />
    </>
  );
}
