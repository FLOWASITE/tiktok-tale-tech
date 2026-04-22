import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bell, MessageSquare, Send, Inbox, Trash2, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Loading, relativeTime, getTelegramMiniApp } from './shared';

type Props = {
  orgId: string;
  userId: string;
  brandId: string | null;
};

type Notif = {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

type ChatMsg = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

type Mode = 'notifications' | 'chat';

export function InboxTab({ orgId, userId, brandId }: Props) {
  const [mode, setMode] = useState<Mode>('notifications');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 p-3 border-b border-border bg-card">
        <button
          onClick={() => setMode('notifications')}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
            mode === 'notifications' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
          }`}
        >
          <Bell className="w-3.5 h-3.5 inline mr-1" /> Thông báo
        </button>
        <button
          onClick={() => setMode('chat')}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
            mode === 'chat' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 inline mr-1" /> Chat AI
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {mode === 'notifications' && <NotificationsPanel userId={userId} />}
        {mode === 'chat' && <ChatPanel orgId={orgId} userId={userId} brandId={brandId} />}
      </div>
    </div>
  );
}

// =================== Notifications ===================
function NotificationsPanel({ userId }: { userId: string }) {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data } = await sb.from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      setItems((data ?? []) as Notif[]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('telegram-miniapp-notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setItems((prev) => [payload.new as Notif, ...prev]);
        getTelegramMiniApp()?.HapticFeedback?.notificationOccurred?.('success');
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  async function markRead(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }

  async function markAllRead() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    await sb.from('notifications').update({ read_at: new Date().toISOString() })
      .eq('user_id', userId).is('read_at', null);
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    toast.success('Đã đánh dấu đã đọc');
  }

  async function remove(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    await sb.from('notifications').delete().eq('id', id);
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  if (loading) return <Loading />;
  const unreadCount = items.filter((n) => !n.read_at).length;

  if (items.length === 0) {
    return (
      <div className="p-6 text-center">
        <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Chưa có thông báo nào.</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{items.length} thông báo · {unreadCount} chưa đọc</span>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={markAllRead}>
            <CheckCheck className="w-3.5 h-3.5 mr-1" /> Đánh dấu đã đọc
          </Button>
        )}
      </div>
      {items.map((n) => (
        <Card key={n.id} className={n.read_at ? 'opacity-70' : 'border-primary/40'} onClick={() => !n.read_at && markRead(n.id)}>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{n.title}</span>
                  {!n.read_at && <Badge variant="secondary" className="text-[9px] bg-primary/15 text-primary">Mới</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{n.message}</p>
                <div className="text-[10px] text-muted-foreground mt-1">{relativeTime(n.created_at)}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); void remove(n.id); }}
                className="text-muted-foreground hover:text-destructive shrink-0 p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =================== Chat ===================
function ChatPanel({ orgId, userId, brandId }: { orgId: string; userId: string; brandId: string | null }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load or create conversation
  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabase as any;
        // Try to find a recent miniapp conversation
        const { data: existing } = await sb.from('chat_conversations')
          .select('id')
          .eq('user_id', userId)
          .eq('organization_id', orgId)
          .contains('metadata', { source: 'telegram_miniapp' })
          .order('last_message_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let convId = existing?.id;
        if (!convId) {
          const { data: created, error } = await sb.from('chat_conversations').insert({
            user_id: userId,
            organization_id: orgId,
            brand_template_id: brandId,
            title: 'Mini App Chat',
            metadata: { source: 'telegram_miniapp' },
          }).select('id').single();
          if (error) throw error;
          convId = created.id;
        }
        setConversationId(convId);

        const { data: msgs } = await sb.from('chat_conversation_messages')
          .select('id, role, content, created_at')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true })
          .limit(50);
        setMessages((msgs ?? []) as ChatMsg[]);
      } catch (e) {
        console.error('[inbox-chat] init failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId, userId, brandId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, sending]);

  async function send() {
    const text = input.trim();
    if (!text || !conversationId || sending) return;
    setSending(true);
    setInput('');
    const userMsg: ChatMsg = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const recent = [...messages.slice(-6), userMsg].map((m) => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke('telegram-miniapp-chat', {
        body: {
          conversation_id: conversationId,
          organization_id: orgId,
          brand_template_id: brandId,
          messages: recent,
        },
      });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp: any = data;
      if (resp?.error) throw new Error(resp.error);
      const reply: string = resp.reply || resp.content || '_(không có phản hồi)_';
      setMessages((prev) => [...prev, {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: reply,
        created_at: new Date().toISOString(),
      }]);
    } catch (e) {
      toast.error('Chat lỗi: ' + (e instanceof Error ? e.message : 'Lỗi'));
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center pt-12">
            <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Chat với Flowa AI để hỏi về brand, ý tưởng, hoặc kế hoạch nội dung.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}>
              {m.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>*]:my-1">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-line">{m.content}</div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-border bg-card p-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder="Nhập tin nhắn…"
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm max-h-32"
          disabled={sending}
        />
        <Button onClick={send} disabled={sending || !input.trim()} size="icon">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
