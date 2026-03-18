import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Target, Users, Zap, Heart, Mail, Phone, MapPin, Clock, Facebook, Linkedin, MessageCircle } from "lucide-react";
import { PublicPageLayout } from "@/landing/components/PublicPageLayout";
import founderImage from "@/assets/founder-duy-vo.jpg";
import { SEOHead } from "@/components/SEOHead";

const values = [
  {
    icon: Target,
    titleKey: "about.values.mission.title",
    descKey: "about.values.mission.desc",
  },
  {
    icon: Users,
    titleKey: "about.values.team.title",
    descKey: "about.values.team.desc",
  },
  {
    icon: Zap,
    titleKey: "about.values.innovation.title",
    descKey: "about.values.innovation.desc",
  },
  {
    icon: Heart,
    titleKey: "about.values.customer.title",
    descKey: "about.values.customer.desc",
  },
];

const stats = [
  { value: "10,000+", labelKey: "about.stats.users" },
  { value: "50+", labelKey: "about.stats.industries" },
  { value: "1M+", labelKey: "about.stats.content" },
  { value: "99%", labelKey: "about.stats.satisfaction" },
];

const contactInfo = [
  {
    icon: Mail,
    labelKey: "contact.info.email",
    value: "support@flowa.one",
    href: "mailto:support@flowa.one",
  },
  {
    icon: Phone,
    labelKey: "contact.info.phone",
    value: "0838 226 363",
    href: "tel:0838226363",
  },
  {
    icon: MapPin,
    labelKey: "contact.info.address",
    value: "Ho Chi Minh City, Vietnam",
    href: null,
  },
  {
    icon: Clock,
    labelKey: "contact.info.hours",
    value: "Mon - Fri: 9:00 - 18:00",
    href: null,
  },
];

const socialLinks = [
  { 
    icon: Facebook, 
    href: "https://www.facebook.com/profile.php?id=61575157292883", 
    label: "Facebook",
  },
  { 
    icon: Linkedin, 
    href: "https://www.linkedin.com/in/flowaone/", 
    label: "LinkedIn",
  },
  { 
    icon: MessageCircle, 
    href: "https://zalo.me/flowa", 
    label: "Zalo",
  },
];

export default function About() {
  const { t } = useTranslation();

  return (
    <PublicPageLayout>
      <SEOHead
        title="Về Flowa - Đội Ngũ & Sứ Mệnh"
        description="Tìm hiểu về Flowa - nền tảng AI giúp tự động hóa content marketing đa kênh. Đội ngũ, giá trị cốt lõi và câu chuyện thành lập."
        canonicalPath="/about"
      />
      {/* Hero Section */}
      <section className="py-20 md:py-28 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              {t("about.title")}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              {t("about.subtitle")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="pb-20 md:pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.labelKey}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center py-6"
              >
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t(stat.labelKey)}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="pb-20 md:pb-28 lg:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="order-1"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl blur-2xl" />
                <img
                  src={founderImage}
                  alt="Duy Vo - Founder & CEO"
                  className="relative rounded-2xl w-full max-w-sm mx-auto object-cover aspect-[3/4] shadow-lg"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="order-2"
            >
              <span className="inline-block text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
                {t("about.founder.label")}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Duy Vo</h2>
              <p className="text-lg text-muted-foreground mb-6">{t("about.founder.role")}</p>
              
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>{t("about.story.p1")}</p>
                <p>{t("about.story.p2")}</p>
                <p>{t("about.story.p3")}</p>
              </div>
              
              <blockquote className="mt-8 pl-5 border-l-2 border-primary/50">
                <p className="italic text-foreground/80 text-lg">
                  "{t("about.quote.text")}"
                </p>
              </blockquote>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="pb-20 md:pb-28 lg:pb-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("about.values.title")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              {t("about.values.subtitle")}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={value.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-2xl p-6 border border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <value.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t(value.titleKey)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(value.descKey)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold">
              {t("contact.info.title")}
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-4xl mx-auto mb-10">
            {contactInfo.map((item, index) => (
              <motion.div
                key={item.labelKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="group text-center py-6 px-4 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto group-hover:bg-primary/15 transition-colors">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  {t(item.labelKey)}
                </p>
                {item.href ? (
                  <a
                    href={item.href}
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    {item.value}
                  </a>
                ) : (
                  <p className="text-sm font-medium">{item.value}</p>
                )}
              </motion.div>
            ))}
          </div>

          {/* Social Links */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center gap-3"
          >
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
                aria-label={social.label}
              >
                <social.icon className="w-4 h-4" />
              </a>
            ))}
          </motion.div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
