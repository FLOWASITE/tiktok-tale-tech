import { useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeNames: Record<string, string> = {
  '/': 'Kịch bản Video',
  '/carousel': 'Carousel Prompt',
};

export function Breadcrumb() {
  const location = useLocation();
  const currentPath = location.pathname;
  const pageName = routeNames[currentPath] || 'Trang';

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Home className="h-4 w-4 text-muted-foreground" />
      <ChevronRight className="h-3 w-3 text-muted-foreground" />
      <span className="font-medium text-foreground">{pageName}</span>
    </nav>
  );
}
