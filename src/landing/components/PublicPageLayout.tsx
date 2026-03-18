import { ReactNode } from "react";
import { LandingNav } from "@/landing/components/LandingNav";
import { FooterSection } from "@/landing/components/FooterSection";
import { ScrollProgress } from "@/landing/components/ScrollProgress";
import { BackToTop } from "@/landing/components/BackToTop";

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
