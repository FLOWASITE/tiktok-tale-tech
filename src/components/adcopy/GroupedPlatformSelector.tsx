import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Star, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AD_PLATFORMS, type AdPlatform } from '@/types/adCopy';

interface GroupedPlatformSelectorProps {
  value: AdPlatform;
  onChange: (platform: AdPlatform) => void;
}

// Group platforms by network
const PLATFORM_GROUPS = [
  {
    name: 'Meta',
    icon: '📘',
    color: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-500/30',
    platforms: ['facebook_feed', 'facebook_story', 'instagram_feed', 'instagram_story', 'instagram_reels'],
  },
  {
    name: 'Google',
    icon: '🔍',
    color: 'from-red-500/10 via-yellow-500/10 to-green-500/10',
    borderColor: 'border-amber-500/30',
    platforms: ['google_rsa', 'google_display'],
  },
  {
    name: 'Social',
    icon: '🌐',
    color: 'from-pink-500/10 to-purple-500/10',
    borderColor: 'border-pink-500/30',
    platforms: ['tiktok', 'linkedin'],
  },
  {
    name: 'Zalo',
    icon: '💬',
    color: 'from-blue-400/10 to-cyan-400/10',
    borderColor: 'border-cyan-500/30',
    platforms: ['zalo_oa', 'zalo_message', 'zalo_article'],
  },
];

// Recommended platforms based on common use
const RECOMMENDED_PLATFORMS = ['facebook_feed', 'instagram_feed', 'google_rsa'];
const NEW_PLATFORMS = ['instagram_reels', 'linkedin'];

export function GroupedPlatformSelector({ value, onChange }: GroupedPlatformSelectorProps) {
  return (
    <ScrollArea className="max-h-[320px] pr-2">
      <div className="space-y-4">
        {PLATFORM_GROUPS.map((group, groupIdx) => (
          <motion.div
            key={group.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIdx * 0.05 }}
          >
            {/* Group Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{group.icon}</span>
              <span className="text-sm font-semibold text-muted-foreground">{group.name}</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>
            
            {/* Platforms Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {group.platforms.map((platformId, idx) => {
                const platform = AD_PLATFORMS.find(p => p.value === platformId);
                if (!platform) return null;
                
                const isSelected = value === platformId;
                const isRecommended = RECOMMENDED_PLATFORMS.includes(platformId);
                const isNew = NEW_PLATFORMS.includes(platformId);
                
                return (
                  <motion.button
                    key={platformId}
                    type="button"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (groupIdx * 0.05) + (idx * 0.02) }}
                    onClick={() => onChange(platformId as AdPlatform)}
                    className={cn(
                      "group relative p-3 rounded-xl border-2 text-left transition-all duration-200 overflow-hidden",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : cn("border-border/50 bg-background/60 hover:border-primary/50 hover:bg-muted/30", group.borderColor.replace('border-', 'hover:border-'))
                    )}
                  >
                    {/* Selected indicator background */}
                    {isSelected && (
                      <motion.div
                        layoutId="grouped-platform-selected"
                        className={cn("absolute inset-0 bg-gradient-to-br", group.color)}
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    
                    <div className="relative z-10">
                      {/* Badges row */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xl">{platform.icon}</span>
                        <div className="flex items-center gap-1">
                          {isRecommended && !isSelected && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-400/50 text-amber-600 bg-amber-50">
                              <Star className="w-2.5 h-2.5 mr-0.5 fill-amber-400" />
                              Hot
                            </Badge>
                          )}
                          {isNew && !isSelected && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-green-400/50 text-green-600 bg-green-50">
                              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                              Mới
                            </Badge>
                          )}
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </div>
                      
                      <div className="font-medium text-sm leading-tight">{platform.label}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {platform.description}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </ScrollArea>
  );
}
