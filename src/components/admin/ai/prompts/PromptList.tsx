// ============================================
// Prompt List Component
// ============================================

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Edit,
  MoreVertical,
  Copy,
  Trash2,
  History,
  Star,
  StarOff,
  FileText,
  Code,
  Beaker,
  AlertTriangle,
  FolderOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Prompt } from "./PromptManager";
import type { CategoryConfig } from "@/hooks/useCategoryConfig";
import { getIconByName } from "../IconPicker";
import { cn } from "@/lib/utils";

interface PromptListProps {
  prompts: Prompt[];
  isLoading: boolean;
  onEdit: (prompt: Prompt) => void;
  onRefresh: () => void;
  categories: CategoryConfig[];
  selectedIds?: Set<string>;
  onToggleSelect?: (promptId: string) => void;
  compact?: boolean;
}

export function PromptList({ 
  prompts, 
  isLoading, 
  onEdit, 
  onRefresh, 
  categories,
  selectedIds = new Set(),
  onToggleSelect,
  compact = false
}: PromptListProps) {
  // Helper to get category by ID
  const getCategoryById = (categoryId: string | null) => {
    if (!categoryId) return null;
    return categories.find(c => c.id === categoryId) || null;
  };
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleActive = async (prompt: Prompt) => {
    setTogglingId(prompt.id);
    try {
      const { error } = await supabase
        .from("ai_prompts")
        .update({ is_active: !prompt.is_active })
        .eq("id", prompt.id);

      if (error) throw error;
      toast.success(`Prompt ${!prompt.is_active ? "đã bật" : "đã tắt"}`);
      onRefresh();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDuplicate = async (prompt: Prompt) => {
    try {
      const { error } = await supabase
        .from("ai_prompts")
        .insert({
          function_name: prompt.function_name,
          prompt_key: `${prompt.prompt_key}_copy_${Date.now()}`,
          name: `${prompt.name} (Copy)`,
          description: prompt.description,
          content: prompt.content,
          prompt_type: prompt.prompt_type,
          variables: prompt.variables,
          tags: prompt.tags,
          category_id: prompt.category_id,
          organization_id: prompt.organization_id,
          version: 1,
          is_active: false,
          is_default: false,
        });

      if (error) throw error;
      toast.success("Đã tạo bản sao!");
      onRefresh();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    }
  };

  const handleDelete = async (prompt: Prompt) => {
    if (!confirm("Bạn có chắc muốn xóa prompt này?")) return;
    
    try {
      const { error } = await supabase
        .from("ai_prompts")
        .delete()
        .eq("id", prompt.id);

      if (error) throw error;
      toast.success("Đã xóa prompt!");
      onRefresh();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    }
  };

  const handleSetDefault = async (prompt: Prompt) => {
    try {
      // First, unset default for all prompts with same function_name and prompt_key
      await supabase
        .from("ai_prompts")
        .update({ is_default: false })
        .eq("function_name", prompt.function_name)
        .eq("prompt_key", prompt.prompt_key);

      // Then set this one as default
      const { error } = await supabase
        .from("ai_prompts")
        .update({ is_default: true })
        .eq("id", prompt.id);

      if (error) throw error;
      toast.success("Đã đặt làm prompt mặc định!");
      onRefresh();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Chưa có prompt nào</p>
          <p className="text-sm text-muted-foreground/70">
            Tạo prompt mới để bắt đầu quản lý AI prompts
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className={compact ? "max-h-[400px]" : "h-[600px]"}>
      <div className="space-y-3 pr-4">
        {prompts.map(prompt => {
          const isSelected = selectedIds.has(prompt.id);
          return (
            <Card 
              key={prompt.id} 
              className={cn(
                "hover:shadow-md transition-all",
                !prompt.is_active && "opacity-60",
                isSelected && "ring-2 ring-primary",
                compact && "shadow-sm"
              )}
            >
              <CardContent className={compact ? "p-3" : "p-4"}>
                <div className="flex items-start justify-between gap-4">
                  {/* Selection checkbox */}
                  {onToggleSelect && (
                    <div className="pt-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect(prompt.id)}
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className={cn("font-medium truncate", compact && "text-sm")}>{prompt.name}</h3>
                    {prompt.is_default && (
                      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                        <Star className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      v{prompt.version}
                    </Badge>
                    {/* Category Badge - hide in compact mode since already grouped */}
                    {!compact && (() => {
                      const category = getCategoryById(prompt.category_id);
                      if (category) {
                        return (
                          <Badge 
                            variant="secondary"
                            className="text-xs flex items-center gap-1"
                            style={{ 
                              backgroundColor: `${category.color}20`, 
                              color: category.color,
                              borderColor: `${category.color}40`
                            }}
                          >
                            {getIconByName(category.icon || 'folder')}
                            {category.label}
                          </Badge>
                        );
                      }
                      return (
                        <Badge 
                          variant="outline" 
                          className="text-xs text-amber-600 border-amber-500/50 bg-amber-500/10"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Chưa phân loại
                        </Badge>
                      );
                    })()}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Code className="h-3.5 w-3.5" />
                    <span className="font-mono text-xs">{prompt.function_name}</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="font-mono text-xs">{prompt.prompt_key}</span>
                  </div>

                  {prompt.description && !compact && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {prompt.description}
                    </p>
                  )}

                  <div className={cn("flex items-center gap-2", compact ? "mt-1" : "mt-2")}>
                    <Badge variant="outline" className="text-xs capitalize">
                      {prompt.prompt_type}
                    </Badge>
                    {!compact && prompt.tags?.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={prompt.is_active}
                    onCheckedChange={() => handleToggleActive(prompt)}
                    disabled={togglingId === prompt.id}
                  />
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onEdit(prompt)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(prompt)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(prompt)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Nhân đôi
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSetDefault(prompt)}>
                        {prompt.is_default ? (
                          <>
                            <StarOff className="h-4 w-4 mr-2" />
                            Bỏ mặc định
                          </>
                        ) : (
                          <>
                            <Star className="h-4 w-4 mr-2" />
                            Đặt làm mặc định
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(prompt)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
