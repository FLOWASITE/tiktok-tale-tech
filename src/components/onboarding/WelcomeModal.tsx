import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';

interface WelcomeModalProps {
  isOpen: boolean;
  onStart: () => void;
  onSkip: (neverShow: boolean) => void;
}

export function WelcomeModal({ isOpen, onStart, onSkip }: WelcomeModalProps) {
  const [neverShowAgain, setNeverShowAgain] = useState(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-card border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={() => onSkip(neverShowAgain)}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors z-10"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Gradient background decoration */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
          
          {/* Content */}
          <div className="relative p-6 pt-8 text-center">
            {/* Animated icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2, damping: 15 }}
              className="mx-auto mb-6 relative"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
                <Sparkles className="w-10 h-10 text-primary-foreground" />
              </div>
              {/* Pulse rings */}
              <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping" />
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-foreground mb-2"
            >
              Chào mừng đến Flowa! 🎉
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground mb-6"
            >
              Hãy để tôi hướng dẫn bạn qua các tính năng chính chỉ trong <span className="text-foreground font-medium">2 phút</span>
            </motion.p>

            {/* Features preview */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-4 mb-6 text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                7 bước đơn giản
              </span>
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Bỏ qua bất kỳ lúc nào
              </span>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-4"
            >
              <Button onClick={onStart} size="lg" className="w-full h-12 text-base">
                <Play className="w-5 h-5 mr-2" />
                Bắt đầu ngay
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => onSkip(neverShowAgain)}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Để sau
              </Button>
            </motion.div>

            {/* Never show again checkbox */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-4 flex items-center justify-center gap-2"
            >
              <Checkbox
                id="never-show"
                checked={neverShowAgain}
                onCheckedChange={(checked) => setNeverShowAgain(checked === true)}
              />
              <label 
                htmlFor="never-show" 
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Không hiển thị lại
              </label>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
