import { Film } from 'lucide-react';
import { NavLink } from '@/components/NavLink';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 gradient-primary rounded-xl blur-lg opacity-50 animate-pulse-glow" />
              <div className="relative gradient-primary p-2.5 rounded-xl">
                <Film className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">Flowa</h1>
              <p className="text-xs text-muted-foreground">One Flow. All Content.</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 ml-4">
            <NavLink
              to="/videos"
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-muted"
              activeClassName="bg-primary/10 text-primary"
            >
              Video Studio
            </NavLink>
            <NavLink
              to="/carousel"
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-muted"
              activeClassName="bg-primary/10 text-primary"
            >
              Carousel Prompt
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
}