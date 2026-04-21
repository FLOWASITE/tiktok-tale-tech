import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';

interface Bubble {
  from: 'user' | 'bot';
  text: string;
}

const BUBBLES: Bubble[] = [
  { from: 'user', text: 'tạo campaign cho spa dịp Tết' },
  { from: 'bot', text: 'Đã hiểu! Spa, dịp Tết, tone ấm áp. Mình tạo 5 bài đa kênh trong ~2 phút nhé...' },
  { from: 'user', text: '/status' },
  { from: 'bot', text: 'Quota tháng này: 12/30 campaign. Còn 18 lượt — thoải mái chạy 🎯' },
];

export function ChatPreview() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="rounded-xl border bg-gradient-to-b from-background to-muted/30 p-3 sm:p-4 space-y-2.5"
      aria-label="Preview chat với AI Agent"
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold pb-1">
        <Sparkles className="w-3 h-3 text-primary" />
        Preview: AI Agent trả lời như thế nào
      </div>

      {BUBBLES.map((b, i) => {
        const isUser = b.from === 'user';
        return (
          <div
            key={i}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${
              visible ? 'animate-in fade-in slide-in-from-bottom-2' : 'opacity-0'
            }`}
            style={{ animationDelay: visible ? `${i * 200}ms` : undefined, animationFillMode: 'both', animationDuration: '400ms' }}
          >
            <div
              className={`max-w-[85%] sm:max-w-[70%] px-3 py-2 text-[13px] sm:text-sm leading-relaxed break-words ${
                isUser
                  ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm'
                  : 'bg-muted text-foreground rounded-2xl rounded-bl-sm'
              }`}
            >
              {!isUser && <span className="mr-1">🤖</span>}
              {b.text}
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-2 pt-1.5 border-t mt-2">
        <div className="flex-1 rounded-full bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground italic">
          Gõ tin nhắn cho AI Agent...
        </div>
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
          <Send className="w-3.5 h-3.5 text-primary" />
        </div>
      </div>
    </div>
  );
}
