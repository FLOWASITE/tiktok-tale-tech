import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trash2, Tag, Download, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import type { CharacterProfile } from '@/hooks/useCharacterProfiles';

interface Props {
  selectedIds: string[];
  profiles: CharacterProfile[];
  brands: { id: string; name: string }[];
  onClear: () => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onBulkAssignBrand: (ids: string[], brandId: string | null) => Promise<void>;
}

export function CharacterBulkBar({
  selectedIds,
  profiles,
  brands,
  onClear,
  onBulkDelete,
  onBulkAssignBrand,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const count = selectedIds.length;
  if (count === 0) return null;

  const exportJson = () => {
    const data = profiles.filter((p) => selectedIds.includes(p.id));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `characters-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${count} nhân vật`);
  };

  return (
    <div className="sticky bottom-4 z-30 flex justify-center pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-2xl bg-foreground text-background shadow-2xl ring-1 ring-foreground/10 backdrop-blur">
        <span className="text-xs font-medium pl-1.5">Đã chọn {count}</span>
        <span className="w-px h-5 bg-background/20" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs hover:bg-background/10 hover:text-background">
              <Tag className="w-3.5 h-3.5" /> Đổi brand <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Gán cho brand…</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onBulkAssignBrand(selectedIds, null)}>
              (Không gắn brand)
            </DropdownMenuItem>
            {brands.map((b) => (
              <DropdownMenuItem key={b.id} onClick={() => onBulkAssignBrand(selectedIds, b.id)}>
                {b.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 text-xs hover:bg-background/10 hover:text-background"
          onClick={exportJson}
        >
          <Download className="w-3.5 h-3.5" /> Xuất JSON
        </Button>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-xs text-red-300 hover:bg-red-500/15 hover:text-red-200"
            >
              <Trash2 className="w-3.5 h-3.5" /> Xoá
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xoá {count} nhân vật?</AlertDialogTitle>
              <AlertDialogDescription>
                Hành động này không thể hoàn tác. Các kịch bản đang dùng nhân vật sẽ bị mất tham chiếu.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Huỷ</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  await onBulkDelete(selectedIds);
                  setConfirmOpen(false);
                }}
              >
                Xoá vĩnh viễn
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 hover:bg-background/10 hover:text-background"
          onClick={onClear}
          title="Bỏ chọn"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
