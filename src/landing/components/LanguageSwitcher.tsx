import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const languages = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'th', name: 'ภาษาไทย', flag: '🇹🇭' },
];

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'toggle' | 'pill';
  className?: string;
}

export function LanguageSwitcher({ variant = 'dropdown', className }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const activeLang = i18n.language?.split('-')[0] || 'vi';
  const currentLang = languages.find((l) => l.code === activeLang) || languages[0];

  const handleLanguageChange = (langCode: string) => {
    localStorage.setItem('flowa_lang_override', langCode);
    localStorage.setItem('i18nextLng', langCode);
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  // Pill variant - compact inline pills
  if (variant === 'pill') {
    return (
      <div className={cn('flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/50 border border-border/40', className)}>
        {languages.map((lang) => (
          <motion.button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              'relative px-1.5 py-1 rounded-md text-[11px] font-medium transition-colors duration-200',
              activeLang === lang.code
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            whileTap={{ scale: 0.95 }}
          >
            {activeLang === lang.code && (
              <motion.div
                layoutId="activePill"
                className="absolute inset-0 bg-primary rounded-md"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">{lang.code.toUpperCase()}</span>
          </motion.button>
        ))}
      </div>
    );
  }

  // Toggle variant - segmented control style
  if (variant === 'toggle') {
    return (
      <div className={cn(
        'relative flex items-center p-1 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 backdrop-blur-sm border border-border/50 shadow-inner',
        className
      )}>
        {languages.map((lang) => (
          <motion.button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              'relative px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 z-10',
              activeLang === lang.code
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            whileHover={{ scale: activeLang === lang.code ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {activeLang === lang.code && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/90 rounded-xl shadow-lg shadow-primary/30"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <span className="text-base leading-none">{lang.flag}</span>
              <span className="tracking-wide">{lang.code.toUpperCase()}</span>
            </span>
          </motion.button>
        ))}
      </div>
    );
  }

  // Dropdown variant - elegant dropdown menu
  return (
    <div className={cn('relative', className)}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300',
          'bg-gradient-to-br from-muted/50 to-transparent hover:from-muted/80',
          'border border-border/50 hover:border-border',
          'text-foreground/80 hover:text-foreground',
          'shadow-sm hover:shadow-md'
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Globe className="w-4 h-4 text-primary" />
        <span className="flex items-center gap-1.5">
          <span className="text-base">{currentLang.flag}</span>
          <span className="hidden sm:inline font-semibold">{currentLang.code.toUpperCase()}</span>
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 top-full mt-2 z-50 min-w-[180px] rounded-2xl bg-card/98 backdrop-blur-xl border border-border/50 shadow-2xl shadow-black/10 overflow-hidden"
            >
              <div className="p-1.5">
                {languages.map((lang, index) => (
                  <motion.button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      activeLang === lang.code
                        ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary'
                        : 'text-foreground hover:bg-muted/60'
                    )}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{lang.flag}</span>
                      <span>{lang.name}</span>
                    </div>
                    {activeLang === lang.code && (
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 500 }}
                        className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-primary" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
