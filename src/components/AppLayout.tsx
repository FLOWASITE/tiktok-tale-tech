import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserAvatar } from '@/components/UserAvatar';
import { Separator } from '@/components/ui/separator';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Top Header Bar */}
          <header className="sticky top-0 z-40 h-14 border-b border-border/50 bg-background/95 backdrop-blur-xl flex items-center px-4 gap-4">
            <SidebarTrigger className="h-8 w-8" />
            <Separator orientation="vertical" className="h-6" />
            <Breadcrumb />
            
            <div className="flex-1" />
            
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserAvatar />
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
