import { HelmetProvider } from "react-helmet-async";
import { AnimatedToaster } from "@/components/ui/animated-toast";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { BrandProvider } from "@/contexts/BrandContext";
import { CarouselGenerationProvider } from "@/contexts/CarouselGenerationContext";
import { GlobalCarouselGenTracker } from "@/components/carousel/GlobalCarouselGenTracker";
import { useDomainRouting } from "@/hooks/useDomainRouting";
import { LandingRoutes } from "@/landing/routes";
import { AppRoutes } from "@/app/routes";

const queryClient = new QueryClient();

function DomainRouter() {
  const { isLandingDomain } = useDomainRouting();

  if (isLandingDomain) {
    return <LandingRoutes />;
  }

  return <AppRoutes />;
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" storageKey="app-theme" enableSystem themes={["light", "dark", "lime", "system"]}>
        <AuthProvider>
          <OrganizationProvider>
            <BrandProvider>
              <TooltipProvider>
                <AnimatedToaster />
                <Sonner />
                <BrowserRouter>
                  <DomainRouter />
                </BrowserRouter>
              </TooltipProvider>
            </BrandProvider>
          </OrganizationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
