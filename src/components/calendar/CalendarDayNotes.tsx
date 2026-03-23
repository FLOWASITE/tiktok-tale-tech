import { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { StickyNote, Plus, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarNote } from '@/hooks/useCalendarNotes';

interface CalendarDayNotesProps {
  date: Date;
  notes: CalendarNote[];
  onAdd: (dateStr: string, content: string) => Promise<CalendarNote | null>;
  onUpdate: (noteId: string, content: string) => Promise<boolean>;
  onDelete: (noteId: string) => Promise<boolean>;
}

export function CalendarDayNotes({ date, notes, onAdd, onUpdate, onDelete }: CalendarDayNotesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const dateStr = format(date, 'yyyy-MM-dd');

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    const result = await onAdd(dateStr, newContent.trim());
    if (result) {
      setNewContent('');
      setIsAdding(false);
    }
  };

  const handleUpdate = async (noteId: string) => {
    if (!editContent.trim()) return;
    const success = await onUpdate(noteId, editContent.trim());
    if (success) {
      setEditingId(null);
      setEditContent('');
    }
  };

  const handleDelete = async (noteId: string) => {
    await onDelete(noteId);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`
            flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded
            hover:bg-muted/80 transition-colors
            ${notes.length > 0 
              ? 'text-amber-600 dark:text-amber-400' 
              : 'text-muted-foreground opacity-0 group-hover:opacity-60'
            }
          `}
          onClick={(e) => e.stopPropagation()}
        >
          <StickyNote className="w-3 h-3" />
          {notes.length > 0 && <span>{notes.length}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-3" 
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Ghi chú — {format(date, 'dd/MM', { locale: vi })}
            </h4>
            {!isAdding && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {/* Existing notes */}
          {notes.map((note) => (
            <div key={note.id} className="group/note relative">
              {editingId === note.id ? (
                <div className="space-y-1.5">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[60px] text-xs resize-none"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 text-xs px-2" onClick={() => handleUpdate(note.id)}>
                      Lưu
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditingId(null)}>
                      Hủy
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-xs p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                  onClick={() => {
                    setEditingId(note.id);
                    setEditContent(note.content);
                  }}
                >
                  <p className="whitespace-pre-wrap break-words text-foreground/80">{note.content}</p>
                  <button
                    className="absolute top-1 right-1 opacity-0 group-hover/note:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(note.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add new note */}
          {isAdding && (
            <div className="space-y-1.5">
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Nhập ghi chú..."
                className="min-h-[60px] text-xs resize-none"
                autoFocus
              />
              <div className="flex gap-1">
                <Button size="sm" className="h-6 text-xs px-2" onClick={handleAdd}>
                  Thêm
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs px-2"
                  onClick={() => { setIsAdding(false); setNewContent(''); }}
                >
                  Hủy
                </Button>
              </div>
            </div>
          )}

          {notes.length === 0 && !isAdding && (
            <p className="text-xs text-muted-foreground italic">Chưa có ghi chú</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
