import { useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { useCuratedEvents } from '@/hooks/useCuratedEvents';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
  ArrowLeft,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { CuratedEvent, EventType, EVENT_TYPE_CONFIG } from '@/types/curatedData';
import { cn } from '@/lib/utils';

export default function AdminEvents() {
  const { events, isLoading, createEvent, updateEvent, deleteEvent, isCreating } = useCuratedEvents();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CuratedEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_date: '',
    end_date: '',
    event_type: 'holiday' as EventType,
    industries: [] as string[],
    suggested_topics: [''],
    suggested_angles: [''],
    priority: 3,
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      event_date: '',
      end_date: '',
      event_type: 'holiday',
      industries: [],
      suggested_topics: [''],
      suggested_angles: [''],
      priority: 3,
      is_active: true,
    });
    setEditingEvent(null);
  };

  const openEditDialog = (event: CuratedEvent) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      description: event.description || '',
      event_date: event.event_date,
      end_date: event.end_date || '',
      event_type: event.event_type as EventType,
      industries: event.industries || [],
      suggested_topics: event.suggested_topics?.length ? event.suggested_topics : [''],
      suggested_angles: event.suggested_angles?.length ? event.suggested_angles : [''],
      priority: event.priority,
      is_active: event.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      ...formData,
      suggested_topics: formData.suggested_topics.filter(t => t.trim()),
      suggested_angles: formData.suggested_angles.filter(a => a.trim()),
      end_date: formData.end_date || null,
    };

    if (editingEvent) {
      updateEvent({ id: editingEvent.id, ...payload });
    } else {
      createEvent(payload);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDaysUntil = (dateStr: string) => {
    const days = differenceInDays(new Date(dateStr), new Date());
    if (days < 0) return { text: 'Đã qua', color: 'text-muted-foreground' };
    if (days === 0) return { text: 'Hôm nay', color: 'text-red-500' };
    if (days <= 7) return { text: `${days} ngày`, color: 'text-amber-500' };
    return { text: `${days} ngày`, color: 'text-muted-foreground' };
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="p-2 rounded-lg bg-red-500/10">
          <CalendarDays className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Quản lý Sự kiện</h1>
          <p className="text-muted-foreground">Sự kiện theo mùa, lễ hội, chiến dịch marketing</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Danh sách sự kiện ({events.length})</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Thêm sự kiện
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingEvent ? 'Chỉnh sửa sự kiện' : 'Thêm sự kiện mới'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tên sự kiện *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="VD: Tết Nguyên Đán 2025"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Loại sự kiện</Label>
                      <Select
                        value={formData.event_type}
                        onValueChange={(v) => setFormData({ ...formData, event_type: v as EventType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key}>{config.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mô tả</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Mô tả ngắn về sự kiện..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ngày bắt đầu *</Label>
                      <Input
                        type="date"
                        value={formData.event_date}
                        onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ngày kết thúc</Label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Độ ưu tiên (1-5)</Label>
                      <Select
                        value={formData.priority.toString()}
                        onValueChange={(v) => setFormData({ ...formData, priority: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(p => (
                            <SelectItem key={p} value={p.toString()}>
                              {p} - {p === 5 ? 'Cao nhất' : p === 1 ? 'Thấp nhất' : 'Trung bình'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Trạng thái</Label>
                      <div className="flex items-center gap-2 pt-2">
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                        />
                        <span className="text-sm">{formData.is_active ? 'Đang hoạt động' : 'Tắt'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Gợi ý chủ đề (mỗi dòng 1 chủ đề)</Label>
                    <Textarea
                      value={formData.suggested_topics.join('\n')}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        suggested_topics: e.target.value.split('\n') 
                      })}
                      placeholder="Khuyến mãi Tết&#10;Quà tặng Tết&#10;Lời chúc năm mới"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Góc tiếp cận gợi ý</Label>
                    <Textarea
                      value={formData.suggested_angles.join('\n')}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        suggested_angles: e.target.value.split('\n') 
                      })}
                      placeholder="Tri ân khách hàng cuối năm&#10;Checklist mua sắm Tết"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Hủy
                    </Button>
                    <Button onClick={handleSubmit} disabled={!formData.name || !formData.event_date}>
                      {editingEvent ? 'Lưu thay đổi' : 'Thêm sự kiện'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Tìm kiếm sự kiện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sự kiện</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Còn lại</TableHead>
                    <TableHead>Ưu tiên</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Không có sự kiện nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvents.map((event) => {
                      const daysInfo = getDaysUntil(event.event_date);
                      const typeConfig = EVENT_TYPE_CONFIG[event.event_type as EventType] || EVENT_TYPE_CONFIG.holiday;
                      
                      return (
                        <TableRow key={event.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{event.name}</p>
                              {event.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {event.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={typeConfig.color}>
                              {typeConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(event.event_date), 'dd/MM/yyyy', { locale: vi })}
                            {event.end_date && (
                              <span className="text-muted-foreground">
                                {' → ' + format(new Date(event.end_date), 'dd/MM', { locale: vi })}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={daysInfo.color}>{daysInfo.text}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(p => (
                                <div 
                                  key={p}
                                  className={cn(
                                    'w-2 h-2 rounded-full',
                                    p <= event.priority ? 'bg-amber-500' : 'bg-muted'
                                  )}
                                />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={event.is_active ? 'default' : 'secondary'}>
                              {event.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(event)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm('Xóa sự kiện này?')) {
                                    deleteEvent(event.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
