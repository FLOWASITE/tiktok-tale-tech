// ============================================
// Prompt Bulk Actions Component
// ============================================

import { useState } from 'react';
import { 
  X, FolderOpen, Trash2, CheckSquare, 
  Square, Loader2, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Prompt } from './PromptManager';
import type { CategoryConfig } from '@/hooks/useCategoryConfig';
import { getIconByName } from '../IconPicker';

interface PromptBulkActionsProps {
  selectedPrompts: Prompt[];
  onClearSelection: () => void;
  onSelectAll?: () => void;
  totalCount?: number;
  categories: CategoryConfig[];
  onRefresh: () => void;
  className?: string;
}

export function PromptBulkActions({
  selectedPrompts,
  onClearSelection,
  onSelectAll,
  totalCount = 0,
  categories,
  onRefresh,
  className,
}: PromptBulkActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'assign' | 'delete'>('assign');

  if (selectedPrompts.length === 0) return null;

  const handleAssignCategory = async () => {
    if (!selectedCategory) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('ai_prompts')
        .update({ category_id: selectedCategory === '__none__' ? null : selectedCategory })
        .in('id', selectedPrompts.map(p => p.id));

      if (error) throw error;
      
      toast.success(`Đã gán category cho ${selectedPrompts.length} prompts`);
      onClearSelection();
      onRefresh();
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    } finally {
      setIsUpdating(false);
      setShowConfirmDialog(false);
    }
  };

  const handleDeleteSelected = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('ai_prompts')
        .delete()
        .in('id', selectedPrompts.map(p => p.id));

      if (error) throw error;
      
      toast.success(`Đã xóa ${selectedPrompts.length} prompts`);
      onClearSelection();
      onRefresh();
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    } finally {
      setIsUpdating(false);
      setShowConfirmDialog(false);
    }
  };

  const allSelected = totalCount > 0 && selectedPrompts.length === totalCount;

  const getCategoryLabel = (categoryId: string | null) => {
    if (!categoryId || categoryId === '__none__') return 'Bỏ phân loại';
    const cat = categories.find(c => c.id === categoryId);
    return cat?.label || 'Unknown';
  };

  return (
    <>
      <div 
        className={cn(
          'fixed bottom-4 left-1/2 -translate-x-1/2 z-40',
          'flex items-center gap-3 px-4 py-3 rounded-xl',
          'bg-background/95 backdrop-blur-sm border shadow-lg',
          'animate-in slide-in-from-bottom-4',
          className
        )}
      >
        {/* Selection count */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {selectedPrompts.length}
          </Badge>
          <span className="text-sm text-muted-foreground">đã chọn</span>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Select all / Deselect all */}
        {onSelectAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={allSelected ? onClearSelection : onSelectAll}
            className="gap-1.5 text-xs"
          >
            {allSelected ? (
              <>
                <Square className="w-3.5 h-3.5" />
                Bỏ chọn tất cả
              </>
            ) : (
              <>
                <CheckSquare className="w-3.5 h-3.5" />
                Chọn tất cả ({totalCount})
              </>
            )}
          </Button>
        )}

        <div className="w-px h-6 bg-border" />

        {/* Assign Category */}
        <div className="flex items-center gap-2">
          <Select
            value={selectedCategory || ''}
            onValueChange={(value) => setSelectedCategory(value)}
          >
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Chọn category..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="flex items-center gap-2">
                  <X className="h-3.5 w-3.5" />
                  Bỏ phân loại
                </span>
              </SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-2">
                    {getIconByName(cat.icon || 'folder')}
                    {cat.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!selectedCategory) {
                toast.error('Vui lòng chọn category');
                return;
              }
              setActionType('assign');
              setShowConfirmDialog(true);
            }}
            disabled={isUpdating || !selectedCategory}
            className="gap-1.5"
          >
            {isUpdating && actionType === 'assign' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FolderOpen className="w-3.5 h-3.5" />
            )}
            Gán category
          </Button>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setActionType('delete');
            setShowConfirmDialog(true);
          }}
          disabled={isUpdating}
          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Xóa
        </Button>

        <div className="w-px h-6 bg-border" />

        {/* Clear */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'delete' ? 'Xác nhận xóa' : 'Xác nhận gán category'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'delete' ? (
                <>
                  Bạn có chắc muốn xóa <strong>{selectedPrompts.length}</strong> prompts? 
                  Hành động này không thể hoàn tác.
                </>
              ) : (
                <>
                  Gán category <strong>{getCategoryLabel(selectedCategory)}</strong> cho{' '}
                  <strong>{selectedPrompts.length}</strong> prompts?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={actionType === 'delete' ? handleDeleteSelected : handleAssignCategory}
              disabled={isUpdating}
              className={actionType === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {actionType === 'delete' ? 'Xóa' : 'Gán'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
