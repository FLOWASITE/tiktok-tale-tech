import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCategoryConfig, CategoryConfig } from '@/hooks/useCategoryConfig';
import { IconPicker, getIconByName } from './IconPicker';
import { Plus, Pencil, Trash2, AlertTriangle, Lock, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface CategoryManagerProps {
  organizationId?: string;
  unknownFunctionsCount?: number;
}

const COLOR_PRESETS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // yellow
  '#f97316', // orange
  '#ec4899', // pink
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#6b7280', // gray
  '#ef4444', // red
  '#84cc16', // lime
];

export function CategoryManager({ organizationId, unknownFunctionsCount = 0 }: CategoryManagerProps) {
  const { 
    categories, 
    isLoading, 
    createCategory, 
    updateCategory, 
    deleteCategory,
    isCreating,
    isUpdating,
    isDeleting,
  } = useCategoryConfig(organizationId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<CategoryConfig> | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const systemCategories = categories.filter(c => c.isSystem);
  const customCategories = categories.filter(c => !c.isSystem);
  const otherCategory = categories.find(c => c.slug === 'other');

  const handleCreate = () => {
    setEditingCategory({
      slug: '',
      label: '',
      icon: 'zap',
      color: '#3b82f6',
      sortOrder: 50,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (category: CategoryConfig) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingCategory?.label || !editingCategory?.slug) return;

    if (editingCategory.id) {
      updateCategory({
        id: editingCategory.id,
        label: editingCategory.label,
        icon: editingCategory.icon,
        color: editingCategory.color,
        sortOrder: editingCategory.sortOrder,
      });
    } else {
      createCategory({
        slug: editingCategory.slug.toLowerCase().replace(/\s+/g, '-'),
        label: editingCategory.label,
        icon: editingCategory.icon || 'zap',
        color: editingCategory.color || '#3b82f6',
        sortOrder: editingCategory.sortOrder || 50,
      });
    }
    setIsDialogOpen(false);
    setEditingCategory(null);
  };

  const handleDelete = (id: string) => {
    deleteCategory(id);
    setDeleteConfirmId(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              AI Function Categories
            </CardTitle>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Thêm Category
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System Categories */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">System Categories</h4>
            <div className="flex flex-wrap gap-2">
              {systemCategories.filter(c => c.slug !== 'other').map(category => (
                <div
                  key={category.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card"
                  style={{ borderColor: `${category.color}30` }}
                >
                  <div
                    className="h-6 w-6 rounded flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}20`, color: category.color }}
                  >
                    {getIconByName(category.icon)}
                  </div>
                  <span className="text-sm font-medium">{category.label}</span>
                  <Badge variant="outline" className="text-[10px] ml-1">
                    <Lock className="h-2.5 w-2.5 mr-0.5" />
                    System
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Other/Unknown Category with Warning */}
          {otherCategory && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-amber-500/20 text-amber-600">
                    {getIconByName(otherCategory.icon)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{otherCategory.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Dành cho functions chưa được phân loại
                    </p>
                  </div>
                </div>
                {unknownFunctionsCount > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30 hover:bg-amber-500/30">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {unknownFunctionsCount} uncategorized
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Custom Categories */}
          {customCategories.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Custom Categories</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {customCategories.map(category => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border bg-card group"
                    style={{ borderColor: `${category.color}30` }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-6 w-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${category.color}20`, color: category.color }}
                      >
                        {getIconByName(category.icon)}
                      </div>
                      <span className="text-sm font-medium">{category.label}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(category)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmId(category.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customCategories.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Chưa có custom category</p>
              <p className="text-xs">Nhấn "Thêm Category" để tạo mới</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingCategory?.id ? 'Chỉnh sửa Category' : 'Tạo Category mới'}
            </DialogTitle>
          </DialogHeader>
          
          {editingCategory && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tên Category</Label>
                <Input
                  value={editingCategory.label || ''}
                  onChange={(e) => setEditingCategory({
                    ...editingCategory,
                    label: e.target.value,
                    slug: editingCategory.id ? editingCategory.slug : e.target.value.toLowerCase().replace(/\s+/g, '-'),
                  })}
                  placeholder="VD: Marketing"
                />
              </div>

              {!editingCategory.id && (
                <div className="space-y-2">
                  <Label>Slug (ID)</Label>
                  <Input
                    value={editingCategory.slug || ''}
                    onChange={(e) => setEditingCategory({
                      ...editingCategory,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                    })}
                    placeholder="marketing"
                  />
                  <p className="text-xs text-muted-foreground">
                    Định danh duy nhất, không đổi sau khi tạo
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Icon & Color</Label>
                <div className="flex items-center gap-3">
                  <IconPicker
                    value={editingCategory.icon || 'zap'}
                    onChange={(icon) => setEditingCategory({ ...editingCategory, icon })}
                  />
                  <div className="flex gap-1 flex-wrap flex-1">
                    {COLOR_PRESETS.map(color => (
                      <button
                        key={color}
                        className={cn(
                          "h-6 w-6 rounded-full border-2 transition-all",
                          editingCategory.color === color 
                            ? "border-foreground scale-110" 
                            : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setEditingCategory({ ...editingCategory, color })}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-3 rounded-lg border bg-muted/50">
                <p className="text-xs text-muted-foreground mb-2">Preview</p>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card w-fit"
                  style={{ borderColor: `${editingCategory.color}30` }}
                >
                  <div
                    className="h-6 w-6 rounded flex items-center justify-center"
                    style={{ 
                      backgroundColor: `${editingCategory.color}20`, 
                      color: editingCategory.color 
                    }}
                  >
                    {getIconByName(editingCategory.icon || 'zap')}
                  </div>
                  <span className="text-sm font-medium">
                    {editingCategory.label || 'Category Name'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!editingCategory?.label || !editingCategory?.slug || isCreating || isUpdating}
            >
              {editingCategory?.id ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa category này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Các functions thuộc category này sẽ được chuyển về "Other/Unknown".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
