import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Save,
  RotateCcw,
  Copy,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import type { Script, ScriptPurpose } from '@/types/script';
import type { VideoGeneration } from '@/types/videoGeneration';
import { parseScriptContent } from '@/utils/parsePrompts';
import {
  serializeScenes,
  emptySceneTemplate,
  type EditableScene,
} from '@/utils/serializeScenes';

interface Props {
  script: Script;
  bySceneNumber: Map<number, VideoGeneration>;
  onScriptUpdate?: (updated: Script) => void;
}

// Tạo id ngắn ổn định
const newId = () => `s_${Math.random().toString(36).slice(2, 10)}`;

export function SceneManagerPanel({ script, bySceneNumber, onScriptUpdate }: Props) {
  const purpose = script.script_purpose as ScriptPurpose;

  // Parse từ script.content khi mount / khi script đổi
  const initialScenes = useMemo<EditableScene[]>(() => {
    const parsed = parseScriptContent(script.content, purpose);
    return parsed.map((p) => ({
      id: newId(),
      rawContent: p.rawContent,
      originalNumber: p.promptNumber,
    }));
  }, [script.content, purpose]);

  const [scenes, setScenes] = useState<EditableScene[]>(initialScenes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // Reset khi script.content đổi từ ngoài (sau save thành công hoặc realtime)
  useEffect(() => {
    setScenes(initialScenes);
    setEditingId(null);
  }, [initialScenes]);

  const dirty = useMemo(() => {
    if (scenes.length !== initialScenes.length) return true;
    return scenes.some((s, i) => {
      const orig = initialScenes[i];
      return !orig || orig.rawContent.trim() !== s.rawContent.trim();
    });
  }, [scenes, initialScenes]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setScenes((prev) => {
      const oldIdx = prev.findIndex((s) => s.id === active.id);
      const newIdx = prev.findIndex((s) => s.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const startEdit = (scene: EditableScene) => {
    setEditingId(scene.id);
    setEditBuffer(scene.rawContent);
  };

  const commitEdit = () => {
    if (!editingId) return;
    setScenes((prev) =>
      prev.map((s) => (s.id === editingId ? { ...s, rawContent: editBuffer } : s)),
    );
    setEditingId(null);
    setEditBuffer('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBuffer('');
  };

  const insertAfter = (id: string) => {
    const newScene: EditableScene = {
      id: newId(),
      rawContent: emptySceneTemplate(purpose),
    };
    setScenes((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return [...prev, newScene];
      const next = [...prev];
      next.splice(idx + 1, 0, newScene);
      return next;
    });
    // Auto-edit scene mới
    setTimeout(() => {
      setEditingId(newScene.id);
      setEditBuffer(newScene.rawContent);
    }, 100);
  };

  const appendNew = () => {
    const newScene: EditableScene = {
      id: newId(),
      rawContent: emptySceneTemplate(purpose),
    };
    setScenes((prev) => [...prev, newScene]);
    setTimeout(() => {
      setEditingId(newScene.id);
      setEditBuffer(newScene.rawContent);
    }, 100);
  };

  const duplicate = (id: string) => {
    setScenes((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const copy: EditableScene = {
        id: newId(),
        rawContent: prev[idx].rawContent,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const confirmDelete = (id: string) => setPendingDelete(id);

  const handleDelete = () => {
    if (!pendingDelete) return;
    setScenes((prev) => prev.filter((s) => s.id !== pendingDelete));
    setPendingDelete(null);
  };

  const reset = () => {
    setScenes(initialScenes);
    setEditingId(null);
    toast.info('Đã hoàn tác mọi thay đổi.');
  };

  const save = async () => {
    if (!dirty || saving) return;

    // Cảnh báo nếu có clip đã render và thứ tự thay đổi
    const orderChanged = scenes.some((s, i) => {
      const orig = initialScenes[i];
      return orig?.id !== s.id;
    });
    const hasRenderedClips = Array.from(bySceneNumber.values()).some(
      (c) => c.status === 'completed',
    );
    if (orderChanged && hasRenderedClips) {
      toast.warning('Một số scene đã có video render', {
        description:
          'Sau khi sắp xếp, video cũ giữ liên kết với số scene cũ. Bạn có thể cần re-render để khớp.',
        duration: 6000,
      });
    }

    setSaving(true);
    try {
      const newContent = serializeScenes(scenes, purpose);
      const { data, error } = await supabase
        .from('scripts')
        .update({ content: newContent, updated_at: new Date().toISOString() })
        .eq('id', script.id)
        .select()
        .single();
      if (error) throw error;

      toast.success(`Đã lưu ${scenes.length} scene`);
      onScriptUpdate?.(data as Script);
    } catch (err: any) {
      console.error('[SceneManagerPanel] save error:', err);
      toast.error('Lưu thất bại', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (scenes.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-border/60 rounded-lg">
        <p className="text-xs text-muted-foreground mb-3">Kịch bản chưa có scene nào.</p>
        <Button size="sm" onClick={appendNew} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Thêm scene đầu tiên
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {scenes.length} scene · kéo thả để sắp xếp
        </div>
        <Button size="sm" variant="outline" onClick={appendNew} className="gap-1.5 h-7 text-[11px]">
          <Plus className="h-3 w-3" />
          Thêm scene
        </Button>
      </div>

      {/* List */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={scenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {scenes.map((scene, idx) => (
              <SortableSceneItem
                key={scene.id}
                scene={scene}
                displayNumber={idx + 1}
                clip={
                  scene.originalNumber ? bySceneNumber.get(scene.originalNumber) : undefined
                }
                isEditing={editingId === scene.id}
                editBuffer={editBuffer}
                onEditBufferChange={setEditBuffer}
                onStartEdit={() => startEdit(scene)}
                onCommitEdit={commitEdit}
                onCancelEdit={cancelEdit}
                onInsertAfter={() => insertAfter(scene.id)}
                onDuplicate={() => duplicate(scene.id)}
                onDelete={() => confirmDelete(scene.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Sticky save bar */}
      {dirty && (
        <div className="sticky bottom-0 z-10 -mx-2 px-2 py-2 bg-background/95 backdrop-blur border-t border-border/60 flex items-center justify-between gap-2">
          <span className="text-[11px] text-amber-600 dark:text-amber-400">
            Có thay đổi chưa lưu
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={reset}
              disabled={saving}
              className="h-7 text-[11px] gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Hoàn tác
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={saving}
              className="h-7 text-[11px] gap-1"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Lưu thay đổi
            </Button>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa scene này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này chỉ thay đổi cấu trúc kịch bản. Video đã render (nếu có) vẫn nằm
              trong thư viện nhưng sẽ không còn map vào scene nào trong danh sách. Bạn cần
              nhấn "Lưu thay đổi" để áp dụng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sortable item
// ─────────────────────────────────────────────────────────────────

interface ItemProps {
  scene: EditableScene;
  displayNumber: number;
  clip?: VideoGeneration;
  isEditing: boolean;
  editBuffer: string;
  onEditBufferChange: (v: string) => void;
  onStartEdit: () => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onInsertAfter: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function SortableSceneItem({
  scene,
  displayNumber,
  clip,
  isEditing,
  editBuffer,
  onEditBufferChange,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onInsertAfter,
  onDuplicate,
  onDelete,
}: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: scene.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Status badge
  const statusBadge = (() => {
    if (!clip) return null;
    if (clip.status === 'completed')
      return (
        <Badge className="text-[10px] h-5 px-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 gap-1">
          <CheckCircle2 className="h-2.5 w-2.5" />
          Đã render
        </Badge>
      );
    if (clip.status === 'processing' || clip.status === 'pending')
      return (
        <Badge className="text-[10px] h-5 px-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 gap-1">
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          Đang render
        </Badge>
      );
    if (clip.status === 'failed')
      return (
        <Badge className="text-[10px] h-5 px-1.5 bg-destructive/15 text-destructive border-0 gap-1">
          <AlertCircle className="h-2.5 w-2.5" />
          Lỗi
        </Badge>
      );
    return null;
  })();

  // Preview lấy 1-2 dòng đầu có nội dung
  const preview = scene.rawContent
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ');

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 border-border/60',
        isDragging && 'shadow-lg ring-2 ring-primary/30',
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-0.5 p-1 -ml-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing rounded hover:bg-muted/50"
          aria-label="Kéo để sắp xếp"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-semibold h-5 px-1.5">
              #{displayNumber}
            </Badge>
            {scene.originalNumber && scene.originalNumber !== displayNumber && (
              <span className="text-[10px] text-muted-foreground">
                (was #{scene.originalNumber})
              </span>
            )}
            {statusBadge}
          </div>

          {isEditing ? (
            <Textarea
              value={editBuffer}
              onChange={(e) => onEditBufferChange(e.target.value)}
              rows={Math.min(12, Math.max(4, editBuffer.split('\n').length))}
              className="font-mono text-[11px] leading-relaxed resize-y"
              autoFocus
              placeholder="Nội dung scene..."
            />
          ) : (
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
              {preview || <span className="italic">Trống</span>}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isEditing ? (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={onCommitEdit}
                className="h-6 w-6 p-0"
                title="Lưu"
              >
                <Check className="h-3 w-3 text-emerald-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancelEdit}
                className="h-6 w-6 p-0"
                title="Hủy"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-0.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={onStartEdit}
                className="h-6 w-6 p-0"
                title="Sửa"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDuplicate}
                className="h-6 w-6 p-0"
                title="Nhân đôi"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onInsertAfter}
                className="h-6 w-6 p-0"
                title="Thêm scene dưới"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="h-6 w-6 p-0 hover:text-destructive"
                title="Xóa"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
