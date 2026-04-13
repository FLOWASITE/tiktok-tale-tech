import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bookmark, Sparkles, ArrowRight, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function NewUserWelcome() {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="flex items-center justify-center py-8 sm:py-16"
    >
      <Card className="w-full max-w-lg border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.03] shadow-2xl shadow-primary/10 overflow-hidden relative">
        {/* Decorative blob */}
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

        <CardContent className="relative p-8 sm:p-10 flex flex-col items-center text-center space-y-6">
          {/* Animated icon */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl scale-150" />
            <div className="relative p-5 rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/10 border border-primary/20">
              <Rocket className="w-10 h-10 text-primary" />
            </div>
          </motion.div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Chào mừng đến Flowa! 🎉
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-sm">
              Bước đầu tiên: Tạo <strong className="text-foreground">Brand Template</strong> để AI hiểu thương hiệu và phong cách nội dung của bạn.
            </p>
          </div>

          {/* Benefits */}
          <div className="w-full space-y-2.5 text-left">
            {[
              'AI tạo nội dung đúng tone & voice thương hiệu',
              'Tự động áp dụng cho mọi kênh nội dung',
              'Chỉ mất 2 phút để thiết lập',
            ].map((text, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 text-sm text-muted-foreground"
              >
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{text}</span>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full space-y-3 pt-2"
          >
            <Button
              asChild
              size="lg"
              className="w-full gap-2 h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/85 hover:from-primary/90 hover:to-primary/75 shadow-lg shadow-primary/25"
            >
              <Link to="/brands/new">
                <Bookmark className="w-5 h-5" />
                Tạo Brand ngay
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
