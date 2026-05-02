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
import { SEOHead, LandingSEOSchemas, type ReviewItem } from "@/components/SEOHead";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

export default function Landing() {
  const { t } = useTranslation();
  const items = t("testimonials.items", { returnObjects: true }) as Array<{
    quote: string; name: string; role: string; company: string;
  }>;
  const reviews: ReviewItem[] = useMemo(() => Array.isArray(items)
    ? items.map(it => ({ author: it.name, role: it.role, company: it.company, rating: 5, text: it.quote }))
    : [], [items]);
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Flowa - Nền Tảng AI Tạo Content Đa Kênh | Tự Động Hóa Marketing"
        description="Flowa giúp Marketing Team tạo content cho 12 kênh chỉ trong 10 phút. Tự động hóa 90% quy trình, giữ brand voice nhất quán với AI."
        canonicalPath="/"
      />
      <LandingSEOSchemas reviews={reviews} />
      <ScrollProgress />
      <LandingNav />
      <main>
        <HeroSection />
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