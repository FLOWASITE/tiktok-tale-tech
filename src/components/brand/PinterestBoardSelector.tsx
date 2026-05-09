import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { ChannelIcon } from '@/components/ui/channel-icon';
import { useToast } from '@/hooks/use-toast';

interface PinterestBoard {
  id: string;
  board_id: string;
  name: string;
  privacy: string | null;
  pin_count: number | null;
  cover_image_url: string | null;
}

interface Props {
  brandTemplateId: string;
  connectionId: string;
  /** Current value persisted on brand_templates.pinterest_default_board_id */
  defaultBoardId: string | null;
  onSaved?: (boardId: string | null) => void;
}

/**
 * Brand-level Pinterest board picker.
 * Lets the user pick which board new Pins from this brand land on by default.
 */
export function PinterestBoardSelector({
  brandTemplateId,
  connectionId,
  defaultBoardId,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [boards, setBoards] = useState<PinterestBoard[]>([]);
  const [selected, setSelected] = useState<string>(defaultBoardId ?? '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [emptyHint, setEmptyHint] = useState<string | null>(null);

  const dirty = useMemo(
    () => (selected || null) !== (defaultBoardId || null),
    [selected, defaultBoardId],
  );

  async function loadBoards(): Promise<PinterestBoard[]> {
    setLoading(true);
    const { data, error } = await supabase
      .from('pinterest_boards')
      .select('id, board_id, name, privacy, pin_count, cover_image_url')
      .eq('connection_id', connectionId)
      .order('name', { ascending: true });
    if (error) {
      console.error('[PinterestBoardSelector] load failed', error);
    }
    const list = (data ?? []) as PinterestBoard[];
    setBoards(list);
    setLoading(false);
    // If only 1 board exists and nothing is selected yet, auto-pick it
    if (list.length === 1 && !defaultBoardId && !selected) {
      setSelected(list[0].board_id);
    }
    return list;
  }

  async function refreshFromPinterest() {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('pinterest-list-boards', {
        body: { connectionId },
      });
      if (error) throw error;
      await loadBoards();
      const count = (data as any)?.boardCount ?? (data as any)?.boards?.length ?? 0;
      if (count === 0) {
        toast({
          title: 'Không tìm thấy board nào',
          description:
            (data as any)?.hint ??
            'Tài khoản Pinterest chưa có board. Hãy tạo 1 board public trên pinterest.com rồi đồng bộ lại.',
          variant: 'destructive',
        });
      } else {
        toast({ title: `Đã đồng bộ ${count} board`, description: 'Danh sách board được làm mới từ Pinterest.' });
      }
    } catch (e: any) {
      toast({
        title: 'Không đồng bộ được board',
        description: e?.message ?? 'Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  }

  async function save() {
    setSaving(true);
    const value = selected || null;
    const { error } = await supabase
      .from('brand_templates')
      .update({ pinterest_default_board_id: value } as any)
      .eq('id', brandTemplateId);
    setSaving(false);
    if (error) {
      toast({
        title: 'Lưu không thành công',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Đã lưu board mặc định', description: 'Pin mới sẽ tự động dùng board này.' });
    onSaved?.(value);
  }

  useEffect(() => {
    loadBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId]);

  useEffect(() => {
    setSelected(defaultBoardId ?? '');
  }, [defaultBoardId]);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <ChannelIcon channel="pinterest" className="text-[#E60023]" size={18} />
        <Label className="text-sm font-medium">Board mặc định cho thương hiệu</Label>
      </div>

      <p className="text-xs text-muted-foreground">
        Mọi Pin tạo từ thương hiệu này sẽ được đăng vào board đã chọn (có thể ghi đè trên từng nội dung).
      </p>

      <div className="flex items-center gap-2">
        <Select value={selected} onValueChange={setSelected} disabled={loading || boards.length === 0}>
          <SelectTrigger className="flex-1">
            {selected && boards.find((b) => b.board_id === selected) ? (
              <span className="truncate">
                {boards.find((b) => b.board_id === selected)?.name}
              </span>
            ) : (
              <SelectValue
                placeholder={
                  loading
                    ? 'Đang tải boards…'
                    : boards.length === 0
                      ? 'Chưa có board nào — bấm Đồng bộ'
                      : 'Chọn board mặc định'
                }
              />
            )}
          </SelectTrigger>
          <SelectContent>
            {boards.map((b) => (
              <SelectItem key={b.board_id} value={b.board_id}>
                {b.name}
                {b.privacy && b.privacy !== 'PUBLIC' && (
                  <span className="ml-1 text-xs text-muted-foreground">({b.privacy.toLowerCase()})</span>
                )}
                {typeof b.pin_count === 'number' && (
                  <span className="ml-1 text-xs text-muted-foreground">· {b.pin_count} pins</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={refreshFromPinterest}
          disabled={refreshing}
          title="Đồng bộ board từ Pinterest"
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        {defaultBoardId && !dirty ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Đã thiết lập
          </span>
        ) : (
          <span className="text-xs text-muted-foreground" />
        )}
        <Button type="button" size="sm" onClick={save} disabled={!dirty || saving}>
          {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          Lưu board mặc định
        </Button>
      </div>
    </div>
  );
}
