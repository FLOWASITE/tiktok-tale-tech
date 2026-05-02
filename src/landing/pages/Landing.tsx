import {
  LandingNav,
  HeroSection,
  WorkflowSection,
  SocialChannelsSection,
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
import { SEOHead, LandingSEOSchemas, type ReviewItem } from "@/components/SEOHead";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

export default function Landing() {
  const { t } = useTranslation();
  const testimonialItems = t("testimonials.items", { returnObjects: true }) as Array<{
    quote: string; name: string; role: string; company: string;
  }>;
  const reviews: ReviewItem[] = useMemo(() => {
    if (!Array.isArray(testimonialItems)) return [];
    return testimonialItems.map((it) => ({
      author: it.name,
      role: it.role,
      company: it.company,
      rating: 5,
      text: it.quote,
    }));
  }, [testimonialItems]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Flowa — AI Marketing Agent | Tự Động Hóa Content Marketing"
        description="Flowa là AI Marketing Agent tự nghiên cứu thị trường, lên chiến dịch, tạo nội dung 12 kênh, chấm điểm chất lượng và đăng bài tự động."
        canonicalPath="/"
      />
      <LandingSEOSchemas reviews={reviews} />
      <ScrollProgress />
      <LandingNav />
      <main>
        <HeroSection />
        <SocialProofBar />
        <ProblemSection />
        <WorkflowSection />
        <SocialChannelsSection />
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