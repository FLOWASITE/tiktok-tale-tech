import { cn } from '@/lib/utils';
import linhAvatarImg from '@/assets/linh-avatar.png';

interface LinhAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  showOnline?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const onlineDotClasses = {
  sm: 'w-2.5 h-2.5 border-[1.5px]',
  md: 'w-3 h-3 border-2',
  lg: 'w-3.5 h-3.5 border-2',
};

export function LinhAvatar({ size = 'md', showOnline = false, className }: LinhAvatarProps) {
  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <img
        src={linhAvatarImg}
        alt="Thùy Linh - Tư vấn viên Flowa"
        className={cn(
          sizeClasses[size],
          "rounded-full object-cover ring-2 ring-white/80 shadow-md"
        )}
      />
      {showOnline && (
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 bg-green-500 rounded-full border-white",
            onlineDotClasses[size]
          )}
        />
      )}
    </div>
  );
}
