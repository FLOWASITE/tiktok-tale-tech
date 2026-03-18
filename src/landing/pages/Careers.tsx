import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Briefcase, 
  MapPin, 
  Rocket, 
  Users, 
  Heart, 
  Zap, 
  Globe,
  ArrowRight,
  Mail,
  Sparkles,
  Coffee,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PublicPageLayout } from "@/components/landing/PublicPageLayout";
import { SEOHead } from "@/components/SEOHead";

const benefits = [
  {
    icon: Globe,
    titleKey: "careers.benefits.remote.title",
    descKey: "careers.benefits.remote.description",
    color: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-600",
  },
  {
    icon: TrendingUp,
    titleKey: "careers.benefits.growth.title",
    descKey: "careers.benefits.growth.description",
    color: "from-green-500/20 to-emerald-500/20",
    iconColor: "text-green-600",
  },
  {
    icon: Users,
    titleKey: "careers.benefits.team.title",
    descKey: "careers.benefits.team.description",
    color: "from-purple-500/20 to-violet-500/20",
    iconColor: "text-purple-600",
  },
  {
    icon: Heart,
    titleKey: "careers.benefits.balance.title",
    descKey: "careers.benefits.balance.description",
    color: "from-rose-500/20 to-pink-500/20",
    iconColor: "text-rose-600",
  },
  {
    icon: Rocket,
    titleKey: "careers.benefits.tech.title",
    descKey: "careers.benefits.tech.description",
    color: "from-orange-500/20 to-amber-500/20",
    iconColor: "text-orange-600",
  },
  {
    icon: Coffee,
    titleKey: "careers.benefits.salary.title",
    descKey: "careers.benefits.salary.description",
    color: "from-indigo-500/20 to-blue-500/20",
    iconColor: "text-indigo-600",
  },
];

const openPositions = [
  {
    id: "frontend-engineer",
    titleKey: "careers.positions.frontend.title",
    type: "Full-time",
    location: "Remote",
    descKey: "careers.positions.frontend.description",
    requirements: [
      "careers.positions.frontend.req1",
      "careers.positions.frontend.req2",
      "careers.positions.frontend.req3",
    ],
    tags: ["React", "TypeScript", "Tailwind"],
  },
  {
    id: "ai-engineer",
    titleKey: "careers.positions.ai.title",
    type: "Full-time",
    location: "Remote",
    descKey: "careers.positions.ai.description",
    requirements: [
      "careers.positions.ai.req1",
      "careers.positions.ai.req2",
      "careers.positions.ai.req3",
    ],
    tags: ["Python", "LLM", "Machine Learning"],
  },
  {
    id: "content-marketer",
    titleKey: "careers.positions.marketing.title",
    type: "Full-time",
    location: "Remote",
    descKey: "careers.positions.marketing.description",
    requirements: [
      "careers.positions.marketing.req1",
      "careers.positions.marketing.req2",
      "careers.positions.marketing.req3",
    ],
    tags: ["Content Strategy", "SEO", "Social Media"],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Careers() {
  const { t } = useTranslation();

  const handleApply = (positionId: string) => {
    window.location.href = `mailto:careers@flowa.one?subject=Application for ${positionId}`;
  };

  return (
    <PublicPageLayout>
      <SEOHead
        title="Tuyển Dụng - Gia Nhập Đội Ngũ Flowa"
        description="Cơ hội nghề nghiệp tại Flowa. Làm việc remote, đội ngũ năng động, xây dựng sản phẩm AI content marketing hàng đầu Việt Nam."
        canonicalPath="/careers"
      />
      {/* Hero Section */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-muted/50 via-background to-background" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Badge 
                variant="secondary" 
                className="mb-6 px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary border-0"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {t("careers.badge")}
              </Badge>
            </motion.div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              <span className="text-foreground">{t("careers.title").split(" ").slice(0, -1).join(" ")} </span>
              <span className="text-primary">{t("careers.title").split(" ").slice(-1)}</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              {t("careers.subtitle")}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="px-8"
                onClick={() => document.getElementById("positions")?.scrollIntoView({ behavior: "smooth" })}
              >
                {t("careers.viewPositions")}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-8"
                onClick={() => window.location.href = "mailto:careers@flowa.one"}
              >
                <Mail className="mr-2 w-4 h-4" />
                {t("careers.cta.button")}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { value: "100%", label: t("careers.stats.remote") },
              { value: "15+", label: t("careers.stats.countries") },
              { value: "4.9", label: t("careers.stats.rating") },
              { value: "∞", label: t("careers.stats.growth") },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why Join Us - Benefits */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("careers.whyJoin.title")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              {t("careers.whyJoin.subtitle")}
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {benefits.map((benefit) => (
              <motion.div
                key={benefit.titleKey}
                variants={itemVariants}
                className="group relative bg-card rounded-2xl p-8 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg"
              >
                {/* Icon with gradient background */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <benefit.icon className={`w-7 h-7 ${benefit.iconColor}`} />
                </div>
                
                <h3 className="text-xl font-semibold mb-3">{t(benefit.titleKey)}</h3>
                <p className="text-muted-foreground leading-relaxed">{t(benefit.descKey)}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="positions" className="py-20 lg:py-28 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4">
              <Briefcase className="w-3.5 h-3.5 mr-1.5" />
              {t("careers.openPositions.badge", { count: openPositions.length })}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("careers.openPositions.title")}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t("careers.openPositions.subtitle")}
            </p>
          </motion.div>

          {openPositions.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="max-w-4xl mx-auto"
            >
              <Accordion type="single" collapsible className="space-y-4">
                {openPositions.map((position) => (
                  <motion.div key={position.id} variants={itemVariants}>
                    <AccordionItem
                      value={position.id}
                      className="bg-card border border-border/50 rounded-2xl px-6 data-[state=open]:border-primary/40 data-[state=open]:shadow-md transition-all duration-300"
                    >
                      <AccordionTrigger className="hover:no-underline py-6">
                        <div className="flex flex-col items-start gap-3 text-left w-full pr-4">
                          <div className="flex items-center justify-between w-full">
                            <h3 className="text-xl font-semibold">{t(position.titleKey)}</h3>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1.5 bg-primary/10 text-primary border-0">
                              <Briefcase className="w-3 h-3" />
                              {position.type}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" />
                              {position.location}
                            </Badge>
                          </div>

                          {/* Tech Tags */}
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {position.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-8">
                        <div className="space-y-6 pt-2">
                          <p className="text-muted-foreground leading-relaxed">
                            {t(position.descKey)}
                          </p>
                          
                          <div className="bg-muted/50 rounded-xl p-5">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Zap className="w-4 h-4 text-primary" />
                              {t("careers.requirements")}
                            </h4>
                            <ul className="space-y-2">
                              {position.requirements.map((req, i) => (
                                <li key={i} className="flex items-start gap-3 text-muted-foreground">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                  <span>{t(req)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <Button 
                            size="lg" 
                            onClick={() => handleApply(position.id)}
                            className="w-full sm:w-auto"
                          >
                            {t("careers.apply")}
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center py-16 bg-card rounded-2xl border border-border/50 max-w-2xl mx-auto"
            >
              <Briefcase className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">{t("careers.noPositions")}</p>
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative max-w-3xl mx-auto text-center"
          >
            {/* Decorative elements */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t("careers.cta.title")}
              </h2>
              <p className="text-muted-foreground mb-8 text-lg max-w-xl mx-auto">
                {t("careers.cta.description")}
              </p>
              <Button
                size="lg"
                className="px-8"
                onClick={() => window.location.href = "mailto:careers@flowa.one"}
              >
                <Mail className="mr-2 w-4 h-4" />
                {t("careers.cta.button")}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
