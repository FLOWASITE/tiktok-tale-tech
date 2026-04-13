import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Layers, 
  FileVideo, 
  Images, 
  Bookmark, 
  Users,
  ArrowRight,
  Keyboard,
  Globe
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { useCurrentBrand } from '@/contexts/BrandContext';

interface QuickAction {
  titleKey: string;
  descKey: string;
  icon: LucideIcon;
  href: string;
  gradient: string;
  shortcut?: string;
  shortcutKey?: string;
  badge?: string;
}

const quickActions: QuickAction[] = [
  { 
    titleKey: 'app.dashboard.multiChannel', 
    descKey: 'app.dashboard.multiChannelDesc',
    icon: Layers,
    href: '/multichannel',
    gradient: 'from-violet-500 to-purple-600',
    shortcut: '⌘N',
    shortcutKey: 'n',
  },
  { 
    titleKey: 'app.dashboard.videoScript', 
    descKey: 'app.dashboard.videoScriptDesc',
    icon: FileVideo,
    href: '/scripts',
    gradient: 'from-rose-500 to-pink-600',
    shortcut: '⌘V',
    shortcutKey: 'v',
  },
  { 
    titleKey: 'app.dashboard.carousel', 
    descKey: 'app.dashboard.carouselDesc',
    icon: Images,
    href: '/carousel',
    gradient: 'from-cyan-500 to-blue-600',
    shortcut: '⌘C',
    shortcutKey: 'c',
  },
  { 
    titleKey: 'app.dashboard.brandManagement', 
    descKey: 'app.dashboard.brandManagementDesc',
    icon: Bookmark,
    href: '/brands',
    gradient: 'from-amber-500 to-orange-600',
    shortcut: '⌘B',
    shortcutKey: 'b',
  },
  { 
    titleKey: 'app.dashboard.connections',
    descKey: 'app.dashboard.connectionsDesc',
    icon: Globe,
    href: '/connections',
    gradient: 'from-green-500 to-emerald-600',
    shortcut: '⌘K',
    shortcutKey: 'k',
  },
  { 
    titleKey: 'app.dashboard.organization', 
    descKey: 'app.dashboard.organizationDesc',
    icon: Users,
    href: '/organization',
    gradient: 'from-emerald-500 to-teal-600',
    shortcut: '⌘O',
    shortcutKey: 'o',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

interface QuickActionGridProps {
  className?: string;
}

export function QuickActionGrid({ className }: QuickActionGridProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { brands, loading: brandsLoading } = useCurrentBrand();
  const hasBrands = brandsLoading || brands.length > 0;

  // Inject "Create Brand" as first item when no brands exist
  const displayActions = hasBrands
    ? quickActions
    : [
        {
          titleKey: 'app.dashboard.brandManagement',
          descKey: 'app.dashboard.brandManagementDesc',
          icon: Bookmark,
          href: '/brands/new',
          gradient: 'from-amber-500 to-orange-600',
          shortcut: '⌘B',
          shortcutKey: 'b',
          badge: 'Bắt đầu tại đây',
        },
        ...quickActions.filter((a) => a.href !== '/brands'),
      ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const action = quickActions.find(a => a.shortcutKey === e.key.toLowerCase());
        if (action) {
          e.preventDefault();
          navigate(action.href);
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [navigate]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
          {t('app.dashboard.quickStart')}
        </h2>
        <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
          <Keyboard className="w-3 h-3" />
          <span>{t('app.dashboard.shortcutsActive')}</span>
        </div>
      </div>

      <div className="grid gap-2 sm:gap-3">
        {displayActions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.div key={action.href} variants={itemVariants}>
              <Link 
                to={action.href}
                data-coachmark={action.href === '/multichannel' ? 'multichannel-action' : undefined}
              >
                <Card className="gradient-card border-border/50 group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
                  <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                    <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center flex-shrink-0 shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${action.gradient} blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-300`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                          {t(action.titleKey)}
                        </p>
                        {action.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary">
                            {action.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {t(action.descKey)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {action.shortcut && (
                        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 px-1.5 rounded border border-border bg-muted/50 text-[10px] font-mono text-muted-foreground group-hover:border-primary/30 group-hover:bg-primary/5 transition-colors">
                          {action.shortcut}
                        </kbd>
                      )}
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
