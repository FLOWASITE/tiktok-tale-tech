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
} from "@/components/landing";
import { ScrollProgress } from "@/components/landing/ScrollProgress";
import { BackToTop } from "@/components/landing/BackToTop";
import { SalesChatWidget } from "@/components/landing/SalesChatWidget";
import { SEOHead, LandingSEOSchemas } from "@/components/SEOHead";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Flowa - Nền Tảng AI Tạo Content Đa Kênh | Tự Động Hóa Marketing"
        description="Flowa giúp Marketing Team tạo content cho 12 kênh chỉ trong 10 phút. Tự động hóa 90% quy trình, giữ brand voice nhất quán với AI."
        canonicalPath="/"
      />
      <LandingSEOSchemas />
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
      <SalesChatWidget />
    </div>
  );
}