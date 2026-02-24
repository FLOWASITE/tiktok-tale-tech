import { useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const routeKeys: Record<string, string> = {
  '/': 'app.breadcrumb.scripts',
  '/carousel': 'app.breadcrumb.carousel',
  '/brands': 'app.breadcrumb.brands',
  '/multichannel': 'app.breadcrumb.multichannel',
};

export function Breadcrumb() {
  const location = useLocation();
  const { t } = useTranslation();
  const currentPath = location.pathname;
  const pageKey = routeKeys[currentPath];
  const pageName = pageKey ? t(pageKey) : t('app.breadcrumb.home');

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Home className="h-4 w-4 text-muted-foreground" />
      <ChevronRight className="h-3 w-3 text-muted-foreground" />
      <span className="font-medium text-foreground">{pageName}</span>
    </nav>
  );
}
