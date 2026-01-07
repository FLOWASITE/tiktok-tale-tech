import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  Rocket, 
  Users, 
  Heart, 
  Zap, 
  Globe,
  ChevronDown,
  ArrowRight
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

const benefits = [
  {
    icon: Globe,
    titleKey: "careers.benefits.remote.title",
    descKey: "careers.benefits.remote.description",
  },
  {
    icon: Zap,
    titleKey: "careers.benefits.growth.title",
    descKey: "careers.benefits.growth.description",
  },
  {
    icon: Users,
    titleKey: "careers.benefits.team.title",
    descKey: "careers.benefits.team.description",
  },
  {
    icon: Heart,
    titleKey: "careers.benefits.balance.title",
    descKey: "careers.benefits.balance.description",
  },
  {
    icon: Rocket,
    titleKey: "careers.benefits.tech.title",
    descKey: "careers.benefits.tech.description",
  },
  {
    icon: Briefcase,
    titleKey: "careers.benefits.salary.title",
    descKey: "careers.benefits.salary.description",
  },
];

const openPositions = [
  {
    id: "frontend-engineer",
    titleKey: "careers.positions.frontend.title",
    type: "Full-time",
    location: "Remote / Ho Chi Minh City",
    descKey: "careers.positions.frontend.description",
    requirements: [
      "careers.positions.frontend.req1",
      "careers.positions.frontend.req2",
      "careers.positions.frontend.req3",
    ],
  },
  {
    id: "ai-engineer",
    titleKey: "careers.positions.ai.title",
    type: "Full-time",
    location: "Remote / Ho Chi Minh City",
    descKey: "careers.positions.ai.description",
    requirements: [
      "careers.positions.ai.req1",
      "careers.positions.ai.req2",
      "careers.positions.ai.req3",
    ],
  },
  {
    id: "content-marketer",
    titleKey: "careers.positions.marketing.title",
    type: "Full-time",
    location: "Remote / Ho Chi Minh City",
    descKey: "careers.positions.marketing.description",
    requirements: [
      "careers.positions.marketing.req1",
      "careers.positions.marketing.req2",
      "careers.positions.marketing.req3",
    ],
  },
];

export default function Careers() {
  const { t } = useTranslation();

  const handleApply = (positionId: string) => {
    window.location.href = `mailto:careers@flowa.one?subject=Application for ${positionId}`;
  };

  return (
    <PublicPageLayout>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge variant="secondary" className="mb-4">
              {t("careers.badge")}
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              {t("careers.title")}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              {t("careers.subtitle")}
            </p>
            <Button
              size="lg"
              onClick={() => document.getElementById("positions")?.scrollIntoView({ behavior: "smooth" })}
            >
              {t("careers.viewPositions")}
              <ChevronDown className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Why Join Us */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("careers.whyJoin.title")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("careers.whyJoin.subtitle")}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t(benefit.titleKey)}</h3>
                <p className="text-muted-foreground text-sm">{t(benefit.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="positions" className="py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("careers.openPositions.title")}
            </h2>
            <p className="text-muted-foreground">
              {t("careers.openPositions.subtitle")}
            </p>
          </motion.div>

          {openPositions.length > 0 ? (
            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="space-y-4">
                {openPositions.map((position, index) => (
                  <motion.div
                    key={position.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <AccordionItem
                      value={position.id}
                      className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/50"
                    >
                      <AccordionTrigger className="hover:no-underline py-6">
                        <div className="flex flex-col items-start gap-2 text-left">
                          <h3 className="text-lg font-semibold">{t(position.titleKey)}</h3>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              {position.type}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {position.location}
                            </Badge>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-6">
                        <div className="space-y-4">
                          <p className="text-muted-foreground">{t(position.descKey)}</p>
                          <div>
                            <h4 className="font-medium mb-2">{t("careers.requirements")}</h4>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                              {position.requirements.map((req, i) => (
                                <li key={i}>{t(req)}</li>
                              ))}
                            </ul>
                          </div>
                          <Button onClick={() => handleApply(position.id)}>
                            {t("careers.apply")}
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-xl">
              <p className="text-muted-foreground">{t("careers.noPositions")}</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              {t("careers.cta.title")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t("careers.cta.description")}
            </p>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.location.href = "mailto:careers@flowa.one"}
            >
              {t("careers.cta.button")}
            </Button>
          </motion.div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
