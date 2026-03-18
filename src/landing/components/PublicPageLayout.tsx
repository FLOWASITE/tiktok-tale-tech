import { ReactNode } from "react";
import { LandingNav } from "./LandingNav";
import { FooterSection } from "./FooterSection";
import { ScrollProgress } from "./ScrollProgress";
import { BackToTop } from "./BackToTop";

interface PublicPageLayoutProps {
  children: ReactNode;
}

export function PublicPageLayout({ children }: PublicPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <LandingNav />
      <main className="pt-16">
        {children}
      </main>
      <FooterSection />
      <BackToTop />
    </div>
  );
}
