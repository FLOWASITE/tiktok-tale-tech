import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  FileText, 
  X, 
  Sparkles,
  Eye,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoreContentPreviewPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onViewFull?: () => void;
  onContinue?: () => void;
  title: string;
  wordCount: number;
  qualityScore: number;
  keyMessages: string[];
  contentGoal?: string;
}

export function CoreContentPreviewPopup({
  isOpen,
  onClose,
  onViewFull,
  onContinue,
  title,
  wordCount,
  qualityScore,
  keyMessages,
  contentGoal,
}: CoreContentPreviewPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Auto-close after 15 seconds if user doesn't interact
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleViewFull = () => {
    handleClose();
    onViewFull?.();
  };

  const handleContinue = () => {
    handleClose();
    onContinue?.();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-24 right-4 z-50 max-w-sm w-full"
        >
          <Card className="bg-card/95 backdrop-blur-md shadow-2xl border-green-500/30 overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 p-4 border-b border-border/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">Core Content đã sẵn sàng!</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{title}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 -mt-1 -mr-1 text-muted-foreground hover:text-foreground"
                  onClick={handleClose}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <CardContent className="p-4 space-y-3">
              {/* Stats */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs gap-1">
                  <FileText className="w-3 h-3" />
                  {wordCount.toLocaleString()} từ
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs gap-1",
                    qualityScore >= 80 ? "border-green-500/50 text-green-600 dark:text-green-400" :
                    qualityScore >= 60 ? "border-amber-500/50 text-amber-600 dark:text-amber-400" :
                    "border-muted-foreground/50"
                  )}
                >
                  <Sparkles className="w-3 h-3" />
                  Điểm: {qualityScore}/100
                </Badge>
                {contentGoal && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {contentGoal}
                  </Badge>
                )}
              </div>

              {/* Key Messages */}
              {keyMessages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" />
                    Thông điệp chính:
                  </p>
                  <ul className="space-y-1.5">
                    {keyMessages.slice(0, 3).map((message, index) => (
                      <li 
                        key={index}
                        className="text-xs text-foreground/90 flex items-start gap-2"
                      >
                        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-[10px] font-medium mt-0.5">
                          {index + 1}
                        </span>
                        <span className="line-clamp-2">{message}</span>
                      </li>
                    ))}
                  </ul>
                  {keyMessages.length > 3 && (
                    <p className="text-[10px] text-muted-foreground">
                      +{keyMessages.length - 3} thông điệp khác
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewFull}
                  className="flex-1 text-xs gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Xem chi tiết
                </Button>
                <Button
                  size="sm"
                  onClick={handleContinue}
                  className="flex-1 text-xs gap-1.5 gradient-primary"
                >
                  Tiếp tục
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>

            {/* Progress bar for auto-close */}
            <motion.div
              className="h-0.5 bg-green-500/50"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 15, ease: 'linear' }}
            />
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
