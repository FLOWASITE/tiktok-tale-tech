import {
  LandingNav,
  HeroSection,
  WorkflowSection,
  IndustryMemorySection,
  SocialProofSection,
  TestimonialsSection,
  PricingSection,
  FAQSection,
  CTASection,
  FooterSection,
} from "@/landing/components";
import { SocialProofBar } from "@/landing/components/SocialProofBar";
import { ProblemSection } from "@/landing/components/ProblemSection";
import { ScrollProgress } from "@/landing/components/ScrollProgress";
import { BackToTop } from "@/landing/components/BackToTop";
import { SalesChatWidget } from "@/landing/components/SalesChatWidget";
import { SEOHead, LandingSEOSchemas } from "@/components/SEOHead";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Flowa — AI Marketing Agent | Tự Động Hóa Content Marketing"
        description="Flowa là AI Marketing Agent tự nghiên cứu thị trường, lên chiến dịch, tạo nội dung 12 kênh, chấm điểm chất lượng và đăng bài tự động."
        canonicalPath="/"
      />
      <LandingSEOSchemas />
      <ScrollProgress />
      <LandingNav />
      <main>
        <HeroSection />
        <SocialProofBar />
        <ProblemSection />
        <WorkflowSection />
        <IndustryMemorySection />
        <SocialProofSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <FooterSection />
      <BackToTop />
      <SalesChatWidget />
    </div>
  );
}