import { motion } from 'framer-motion';
import { Sparkles, Palette, Users, Target, Plus, Zap, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BrandEmptyStateProps {
  onCreateNew: () => void;
  onImportFromUrl?: () => void;
}

const floatingIcons = [
  { Icon: Palette, delay: 0, x: -60, y: -40 },
  { Icon: Users, delay: 0.2, x: 60, y: -30 },
  { Icon: Target, delay: 0.4, x: -50, y: 40 },
  { Icon: Zap, delay: 0.6, x: 70, y: 50 },
];

export function BrandEmptyState({ onCreateNew, onImportFromUrl }: BrandEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Animated illustration container */}
      <div className="relative w-48 h-48 mb-8">
        {/* Central glowing orb */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 blur-2xl scale-150" />
            
            {/* Main circle */}
            <motion.div
              className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 flex items-center justify-center backdrop-blur-sm"
              animate={{ 
                boxShadow: [
                  '0 0 20px hsl(var(--primary) / 0.3)',
                  '0 0 40px hsl(var(--primary) / 0.5)',
                  '0 0 20px hsl(var(--primary) / 0.3)',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-10 h-10 text-primary" />
            </motion.div>
          </div>
        </motion.div>

        {/* Floating icons */}
        {floatingIcons.map(({ Icon, delay, x, y }, index) => (
          <motion.div
            key={index}
            className="absolute left-1/2 top-1/2"
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              x, 
              y,
            }}
            transition={{ 
              delay: delay + 0.3,
              duration: 0.5,
              ease: 'easeOut',
            }}
          >
            <motion.div
              className="p-2.5 rounded-xl bg-card/80 border border-border/50 shadow-lg backdrop-blur-sm"
              animate={{ 
                y: [0, -8, 0],
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                delay: delay,
                ease: 'easeInOut',
              }}
            >
              <Icon className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          </motion.div>
        ))}

        {/* Orbiting particles */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute left-1/2 top-1/2 w-2 h-2"
            style={{ marginLeft: -4, marginTop: -4 }}
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 0.5,
            }}
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-primary/60"
              style={{ 
                transform: `translateX(${50 + i * 15}px)`,
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Text content */}
      <motion.div
        className="text-center max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-3">
          Bắt đầu xây dựng thương hiệu
        </h3>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Tạo Brand Template đầu tiên để AI hiểu rõ giọng nói, phong cách và giá trị cốt lõi của thương hiệu bạn.
        </p>

        {/* CTA Button */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button 
            onClick={onCreateNew}
            size="lg"
            className="group relative overflow-hidden bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground shadow-lg shadow-primary/25"
          >
            <span className="relative z-10 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Tạo Brand Template đầu tiên
            </span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
              }}
            />
          </Button>
        </motion.div>

        {onImportFromUrl && (
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onImportFromUrl}
              className="text-muted-foreground hover:text-foreground gap-2"
            >
              <Download className="w-4 h-4" />
              Hoặc import từ website / fanpage
            </Button>
          </div>
        )}
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
              }}
            />
          </Button>
        </motion.div>
      </motion.div>

      {/* Feature hints */}
      <motion.div
        className="mt-12 grid grid-cols-3 gap-6 max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        {[
          { icon: Palette, label: 'Brand Voice' },
          { icon: Users, label: 'Personas' },
          { icon: Target, label: 'Guidelines' },
        ].map(({ icon: Icon, label }, i) => (
          <motion.div
            key={label}
            className="flex flex-col items-center gap-2 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 + i * 0.1 }}
          >
            <div className="p-2 rounded-lg bg-muted/50">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">{label}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
