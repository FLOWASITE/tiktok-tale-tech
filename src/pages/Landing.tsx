import {
  LandingNav,
  HeroSection,
  WorkflowSection,
  IndustryMemorySection,
  SocialProofSection,
  PricingSection,
  FAQSection,
  CTASection,
  FooterSection,
} from "@/components/landing";
import { ScrollProgress } from "@/components/landing/ScrollProgress";
import { BackToTop } from "@/components/landing/BackToTop";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <LandingNav />
      <main>
        <HeroSection />
        <WorkflowSection />
        <IndustryMemorySection />
        <SocialProofSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <FooterSection />
      <BackToTop />
    </div>
  );
}