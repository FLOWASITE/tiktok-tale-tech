import { cn } from '@/lib/utils';

interface IllustrationProps {
  className?: string;
}

// Animated floating dots/particles
export function FloatingParticles({ className }: IllustrationProps) {
  return (
    <div className={cn('relative w-24 h-24', className)}>
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-primary/40"
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 60}%`,
            animation: `float-particle ${2 + Math.random() * 2}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50% { transform: translateY(-10px) scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Calendar illustration with pulse
export function CalendarIllustration({ className }: IllustrationProps) {
  return (
    <div className={cn('relative w-20 h-20', className)}>
      {/* Calendar base */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 rounded-xl shadow-lg">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-t-xl" />
        {/* Calendar rings */}
        <div className="absolute top-1 left-3 w-2 h-3 bg-muted-foreground/30 rounded-full" />
        <div className="absolute top-1 right-3 w-2 h-3 bg-muted-foreground/30 rounded-full" />
        {/* Grid dots */}
        <div className="absolute bottom-3 left-3 right-3 grid grid-cols-4 gap-1.5">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full',
                i === 5 ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground/20'
              )}
            />
          ))}
        </div>
      </div>
      {/* Floating notification */}
      <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] text-primary-foreground font-bold animate-bounce">
        !
      </div>
    </div>
  );
}

// Chart illustration
export function ChartIllustration({ className }: IllustrationProps) {
  return (
    <div className={cn('relative w-20 h-20', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl p-3">
        {/* Bars */}
        <div className="flex items-end gap-1.5 h-full">
          {[40, 70, 55, 85, 60].map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-sm"
              style={{
                height: `${height}%`,
                animation: 'bar-grow 0.5s ease-out forwards',
                animationDelay: `${i * 0.1}s`,
                opacity: 0,
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes bar-grow {
          from { height: 0; opacity: 0; }
          to { height: var(--bar-height); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Sparkle/AI illustration
export function SparkleIllustration({ className }: IllustrationProps) {
  return (
    <div className={cn('relative w-20 h-20', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-violet-500/10 rounded-xl flex items-center justify-center">
        {/* Central sparkle */}
        <div className="relative">
          <div className="w-8 h-8 bg-gradient-to-r from-primary to-violet-500 rounded-lg transform rotate-45 animate-pulse" />
          {/* Orbiting particles */}
          {[0, 120, 240].map((angle, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-primary rounded-full"
              style={{
                animation: `orbit 3s linear infinite`,
                animationDelay: `${i * 1}s`,
                transformOrigin: '50% 50%',
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(20px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(20px) rotate(-360deg); }
        }
      `}</style>
    </div>
  );
}

// Book/Bank illustration
export function BookIllustration({ className }: IllustrationProps) {
  return (
    <div className={cn('relative w-20 h-20', className)}>
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Book stack */}
        <div className="relative">
          <div className="w-14 h-3 bg-amber-400 rounded-sm transform -rotate-3 translate-y-2" />
          <div className="w-14 h-3 bg-amber-500 rounded-sm transform rotate-2" />
          <div className="w-14 h-3 bg-amber-600 rounded-sm transform -rotate-1 -translate-y-2" />
          {/* Light bulb floating */}
          <div className="absolute -top-4 -right-2 text-2xl animate-bounce">
            💡
          </div>
        </div>
      </div>
    </div>
  );
}

// Target illustration
export function TargetIllustration({ className }: IllustrationProps) {
  return (
    <div className={cn('relative w-20 h-20', className)}>
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Target rings */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-2 border-4 border-primary/40 rounded-full" />
          <div className="absolute inset-4 border-4 border-primary/60 rounded-full" />
          <div className="absolute inset-6 bg-primary rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Brain/AI Learning illustration
export function BrainIllustration({ className }: IllustrationProps) {
  return (
    <div className={cn('relative w-20 h-20', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl flex items-center justify-center">
        <div className="text-4xl animate-pulse">🧠</div>
        {/* Neural network lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 80">
          <line x1="20" y1="20" x2="40" y2="40" stroke="currentColor" strokeWidth="1" className="text-orange-400/50" />
          <line x1="60" y1="20" x2="40" y2="40" stroke="currentColor" strokeWidth="1" className="text-orange-400/50" />
          <line x1="20" y1="60" x2="40" y2="40" stroke="currentColor" strokeWidth="1" className="text-orange-400/50" />
          <line x1="60" y1="60" x2="40" y2="40" stroke="currentColor" strokeWidth="1" className="text-orange-400/50" />
          {[{ cx: 20, cy: 20 }, { cx: 60, cy: 20 }, { cx: 20, cy: 60 }, { cx: 60, cy: 60 }].map((pos, i) => (
            <circle
              key={i}
              cx={pos.cx}
              cy={pos.cy}
              r="4"
              className="fill-orange-400"
              style={{
                animation: 'pulse-node 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </svg>
      </div>
      <style>{`
        @keyframes pulse-node {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

// Mapping type to illustration component
export const ILLUSTRATION_MAP = {
  seasonal: CalendarIllustration,
  'success-topics': ChartIllustration,
  'ai-suggestions': SparkleIllustration,
  'topic-bank': BookIllustration,
  analytics: ChartIllustration,
  'weekly-plan': CalendarIllustration,
  'conflict-checker': BrainIllustration,
  'no-brand-selected': TargetIllustration,
} as const;
