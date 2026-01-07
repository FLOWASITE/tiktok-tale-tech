import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Send, Trash2, Volume2, VolumeX, MessageCircle, Phone, User, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSalesChat, SalesChatMessage } from '@/hooks/useSalesChat';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { LinhAvatar } from './LinhAvatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const SALES_REACTIONS = ['👍', '👎', '❤️'];
const GREET_STORAGE_KEY = 'flowa_sales_greeted';
const SOUND_STORAGE_KEY = 'flowa_sales_sound';

// Message Bubble Component
function MessageBubble({ 
  message, 
  onSuggestionClick, 
  onCtaClick,
  onReact,
}: {
  message: SalesChatMessage;
  onSuggestionClick: (text: string) => void;
  onCtaClick: (action: string) => void;
  onReact: (messageId: string, emoji: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-2 mb-3 group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <LinhAvatar size="sm" />
      )}
      
      <div className={cn(
        "max-w-[85%] rounded-2xl px-4 py-2.5",
        isUser 
          ? "bg-primary text-primary-foreground rounded-br-md" 
          : "bg-muted rounded-bl-md"
      )}>
        <div className={cn(
          "text-sm prose prose-sm max-w-none",
          isUser ? "prose-invert" : ""
        )}>
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* CTA Actions */}
        {message.ctaActions && message.ctaActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.ctaActions.map((cta, idx) => (
              <Button
                key={idx}
                size="sm"
                variant={cta.action === 'REGISTER' ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={() => onCtaClick(cta.action)}
              >
                {cta.label}
              </Button>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {message.suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onSuggestionClick(suggestion)}
                className="text-xs bg-background/50 hover:bg-background/80 border border-border/50 rounded-full px-3 py-1 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Emoji Reactions - Only for assistant messages */}
        {!isUser && (
          <div className="flex items-center gap-1 mt-2">
            {/* Show existing reactions */}
            {message.reactions && message.reactions.length > 0 && (
              <div className="flex gap-0.5 mr-1">
                {message.reactions.map((emoji, idx) => (
                  <span key={idx} className="text-sm">{emoji}</span>
                ))}
              </div>
            )}
            {/* Reaction picker */}
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {SALES_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className={cn(
                    "text-sm hover:scale-125 transition-transform px-1 rounded hover:bg-primary/10",
                    message.reactions?.includes(emoji) && "bg-primary/20"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium">Bạn</span>
        </div>
      )}
    </motion.div>
  );
}

// Enhanced Typing Indicator with name
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-2 mb-3"
    >
      <LinhAvatar size="sm" />
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Thùy Linh đang nhập</span>
          <div className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 bg-primary/70 rounded-full"
                animate={{ 
                  y: [0, -3, 0],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Lead Capture Form
function LeadCaptureForm({ 
  onSubmit, 
  onClose 
}: { 
  onSubmit: (data: { name?: string; email?: string; phone?: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) return;
    setIsSubmitting(true);
    await onSubmit({ name: name || undefined, email: email || undefined, phone: phone || undefined });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          Họ tên
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nguyễn Văn A"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" />
          Email *
        </label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@company.com"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5" />
          Số điện thoại
        </label>
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0901234567"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Để sau
        </Button>
        <Button type="submit" disabled={(!email && !phone) || isSubmitting} className="flex-1">
          {isSubmitting ? 'Đang gửi...' : 'Gửi thông tin'}
        </Button>
      </div>
    </form>
  );
}

// Handoff Options
function HandoffOptions({ onSelect }: { onSelect: (platform: string) => void }) {
  const platforms = [
    { id: 'zalo', label: 'Zalo', icon: '💬', url: 'https://zalo.me/flowa' },
    { id: 'messenger', label: 'Messenger', icon: '💭', url: 'https://m.me/flowa.vn' },
    { id: 'phone', label: 'Gọi điện', icon: '📞', url: 'tel:19001234' },
  ];

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {platforms.map(p => (
        <a
          key={p.id}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onSelect(p.id)}
          className="flex items-center gap-1.5 bg-muted hover:bg-muted/80 border border-border rounded-full px-3 py-1.5 text-xs transition-colors"
        >
          <span>{p.icon}</span>
          <span>{p.label}</span>
        </a>
      ))}
    </div>
  );
}

// Proactive Greeting Tooltip - Simple div, no hooks
const GreetingTooltip = ({ onDismiss }: { onDismiss: () => void }) => (
  <motion.div
    initial={{ opacity: 0, x: 20, scale: 0.9 }}
    animate={{ opacity: 1, x: 0, scale: 1 }}
    exit={{ opacity: 0, x: 20, scale: 0.9 }}
    onAnimationComplete={(definition) => {
      // Auto dismiss after animation completes and 10s
      if (definition === 'animate') {
        const timer = setTimeout(onDismiss, 10000);
        return () => clearTimeout(timer);
      }
    }}
    className="absolute right-full mr-3 bottom-2 whitespace-nowrap bg-background shadow-lg rounded-full px-4 py-2.5 text-sm border border-border"
  >
    <span className="font-medium">Em có thể giúp gì cho anh/chị ạ? 😊</span>
    {/* Arrow pointing right */}
    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-background border-r border-b border-border rotate-[-45deg]" />
  </motion.div>
);

export function SalesChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem(SOUND_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [showGreetTooltip, setShowGreetTooltip] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showHandoff, setShowHandoff] = useState(false);
  
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    clearMessages, 
    addReaction,
    saveLead,
    requestHandoff,
    interestLevel,
  } = useSalesChat();
  const { playSend, playReceive } = useSoundEffects(soundEnabled);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Save sound preference
  useEffect(() => {
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled));
    } catch {}
  }, [soundEnabled]);

  // Proactive greeting after 30 seconds
  useEffect(() => {
    const hasGreeted = localStorage.getItem(GREET_STORAGE_KEY) === 'true';
    if (hasGreeted || isOpen) return;

    const timer = setTimeout(() => {
      setShowGreetTooltip(true);
      localStorage.setItem(GREET_STORAGE_KEY, 'true');
    }, 30000);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Auto-dismiss greeting tooltip after 10 seconds
  useEffect(() => {
    if (!showGreetTooltip) return;
    const timer = setTimeout(() => setShowGreetTooltip(false), 10000);
    return () => clearTimeout(timer);
  }, [showGreetTooltip]);

  // Handle unread count and sound when new assistant message arrives
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const newMessage = messages[messages.length - 1];
      if (newMessage.role === 'assistant') {
        playReceive();
        if (!isOpen) {
          setUnreadCount(prev => prev + 1);
        }
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, isOpen, playReceive]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setShowGreetTooltip(false);
    }
  }, [isOpen]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput('');
    playSend();
    await sendMessage(text);
  };

  const handleSuggestionClick = (text: string) => {
    playSend();
    sendMessage(text);
  };

  const handleCtaClick = (action: string) => {
    switch (action) {
      case 'REGISTER':
        window.location.href = '/auth?mode=register';
        break;
      case 'PRICING':
        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
        setIsOpen(false);
        break;
      case 'DEMO':
        window.open('https://flowa.vn/demo', '_blank');
        break;
      case 'CONTACT':
        window.location.href = 'mailto:support@flowa.vn';
        break;
    }
  };

  const handleReact = useCallback((messageId: string, emoji: string) => {
    addReaction(messageId, emoji);
  }, [addReaction]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    // Swipe down to close on mobile
    if (isMobile && info.offset.y > 100) {
      setIsOpen(false);
    }
  }, [isMobile]);

  const dismissGreetTooltip = useCallback(() => {
    setShowGreetTooltip(false);
  }, []);

  const handleLeadSubmit = useCallback(async (data: { name?: string; email?: string; phone?: string }) => {
    await saveLead(data);
  }, [saveLead]);

  const handleHandoff = useCallback(async (platform: string) => {
    await requestHandoff(platform);
    setShowHandoff(false);
  }, [requestHandoff]);

  return (
    <>
      {/* FAB Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            {/* Proactive Greeting Tooltip */}
            <AnimatePresence>
              {showGreetTooltip && (
                <GreetingTooltip onDismiss={dismissGreetTooltip} />
              )}
            </AnimatePresence>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(true)}
              className="relative flex items-center gap-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground pl-1.5 pr-4 py-1.5 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            >
              <LinhAvatar size="lg" showOnline />
              <span className="text-sm font-medium hidden sm:inline">Chat với Thùy Linh</span>
              
              {/* Unread Badge */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              
              {/* Pulse effect */}
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/30"
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag={isMobile ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed z-50 bg-background border shadow-2xl flex flex-col overflow-hidden",
              // Mobile: full screen
              "inset-0 w-full h-full rounded-none border-0",
              // Desktop: positioned popup
              "sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[400px] sm:h-[600px] sm:max-h-[80vh] sm:rounded-2xl sm:border-border"
            )}
          >
            {/* Drag indicator on mobile */}
            {isMobile && (
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LinhAvatar size="md" className="ring-white/30" />
                <div>
                  <h3 className="font-semibold text-sm">Chat với Thùy Linh</h3>
                  <p className="text-xs opacity-80">Tư vấn viên Flowa</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Sound Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
                  onClick={clearMessages}
                  title="Xóa hội thoại"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onSuggestionClick={handleSuggestionClick}
                  onCtaClick={handleCtaClick}
                  onReact={handleReact}
                />
              ))}
              
              {/* Show handoff options when high interest */}
              {!showHandoff && messages.length >= 5 && interestLevel !== 'low' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 p-3 bg-muted/50 rounded-xl border border-border"
                >
                  <p className="text-xs text-muted-foreground mb-2">
                    Cần tư vấn chi tiết hơn?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setShowHandoff(true)}
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Nói chuyện với người thật
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs"
                      onClick={() => setShowLeadForm(true)}
                    >
                      <Phone className="w-3 h-3 mr-1" />
                      Để lại thông tin liên hệ
                    </Button>
                  </div>
                  {showHandoff && (
                    <div className="mt-2">
                      <p className="text-xs font-medium mb-1">Chọn kênh liên hệ:</p>
                      <HandoffOptions onSelect={handleHandoff} />
                    </div>
                  )}
                </motion.div>
              )}
              
              <AnimatePresence>
                {isLoading && <TypingIndicator />}
              </AnimatePresence>
            </ScrollArea>

            {/* Input */}
            <div className={cn(
              "p-3 border-t border-border bg-muted/30",
              isMobile && "pb-safe" // Safe area for iPhone
            )}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Nhập câu hỏi của bạn..."
                  disabled={isLoading}
                  className="flex-1 bg-background"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  className="flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Powered by Flowa AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lead Capture Dialog */}
      <Dialog open={showLeadForm} onOpenChange={setShowLeadForm}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinhAvatar size="sm" />
              Để lại thông tin
            </DialogTitle>
            <DialogDescription>
              Em sẽ liên hệ tư vấn chi tiết cho anh/chị ạ! 😊
            </DialogDescription>
          </DialogHeader>
          <LeadCaptureForm 
            onSubmit={handleLeadSubmit}
            onClose={() => setShowLeadForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
