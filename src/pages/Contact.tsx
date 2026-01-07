import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send, 
  Facebook, 
  Linkedin, 
  MessageCircle,
  Sparkles,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PublicPageLayout } from "@/components/landing/PublicPageLayout";
import { toast } from "sonner";

const contactInfo = [
  {
    icon: Mail,
    labelKey: "contact.info.email",
    value: "support@flowa.one",
    href: "mailto:support@flowa.one",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Phone,
    labelKey: "contact.info.phone",
    value: "0838 226 363",
    href: "tel:0838226363",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: MapPin,
    labelKey: "contact.info.address",
    value: "Ho Chi Minh City, Vietnam",
    href: null,
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Clock,
    labelKey: "contact.info.hours",
    value: "Mon - Fri: 9:00 - 18:00",
    href: null,
    gradient: "from-amber-500 to-orange-500",
  },
];

const socialLinks = [
  { 
    icon: Facebook, 
    href: "https://www.facebook.com/profile.php?id=61575157292883", 
    label: "Facebook",
    color: "hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/30"
  },
  { 
    icon: Linkedin, 
    href: "https://www.linkedin.com/in/flowaone/", 
    label: "LinkedIn",
    color: "hover:bg-sky-500/10 hover:text-sky-500 hover:border-sky-500/30"
  },
  { 
    icon: MessageCircle, 
    href: "https://zalo.me/flowa", 
    label: "Zalo",
    color: "hover:bg-blue-600/10 hover:text-blue-600 hover:border-blue-600/30"
  },
];

// Floating decorative elements
const FloatingElement = ({ 
  delay = 0, 
  duration = 6,
  className = "" 
}: { 
  delay?: number; 
  duration?: number;
  className?: string;
}) => (
  <motion.div
    className={`absolute rounded-full blur-3xl opacity-20 ${className}`}
    animate={{
      y: [0, -30, 0],
      scale: [1, 1.1, 1],
      opacity: [0.2, 0.3, 0.2],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

export default function Contact() {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    toast.success(t("contact.form.success"));
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    setIsSubmitting(false);
    setIsSubmitted(true);
    
    // Reset success state after 5 seconds
    setTimeout(() => setIsSubmitted(false), 5000);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <PublicPageLayout>
      {/* Hero Section with Advanced Visual Effects */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        
        {/* Animated gradient orbs */}
        <FloatingElement 
          className="w-[600px] h-[600px] bg-primary/30 -top-40 -left-40" 
          delay={0} 
        />
        <FloatingElement 
          className="w-[500px] h-[500px] bg-secondary/30 -bottom-20 -right-20" 
          delay={2} 
        />
        <FloatingElement 
          className="w-[300px] h-[300px] bg-primary/20 top-1/2 left-1/2 -translate-x-1/2" 
          delay={4} 
        />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
        
        {/* Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {t("contact.badge", "Chúng tôi sẵn sàng hỗ trợ 24/7")}
              </span>
            </motion.div>
            
            {/* Title with gradient */}
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold mb-6 tracking-tight">
              <span className="text-gradient">{t("contact.title")}</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t("contact.subtitle")}
            </p>
            
            {/* Quick stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-wrap justify-center gap-8 mt-12"
            >
              {[
                { value: "<2h", label: t("contact.stats.responseTime", "Thời gian phản hồi") },
                { value: "99%", label: t("contact.stats.satisfaction", "Hài lòng") },
                { value: "24/7", label: t("contact.stats.support", "Hỗ trợ") },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl md:text-4xl font-bold text-gradient">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
        
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Contact Form & Info Section */}
      <section className="py-16 lg:py-24 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
            {/* Contact Form - Takes 3 columns */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="lg:col-span-3"
            >
              <div className="relative">
                {/* Gradient border effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-secondary to-primary rounded-3xl opacity-20 blur-sm" />
                
                <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl p-8 md:p-10 border border-border/50 shadow-xl">
                  {/* Form header */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{t("contact.form.title")}</h2>
                      <p className="text-muted-foreground text-sm">{t("contact.form.description", "Điền thông tin bên dưới và chúng tôi sẽ liên hệ sớm nhất")}</p>
                    </div>
                  </div>
                  
                  {isSubmitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-16 text-center"
                    >
                      <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">{t("contact.form.successTitle", "Gửi thành công!")}</h3>
                      <p className="text-muted-foreground max-w-sm">
                        {t("contact.form.successMessage", "Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.")}
                      </p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-sm font-medium">
                            {t("contact.form.name")} <span className="text-primary">*</span>
                          </Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            required
                            placeholder={t("contact.form.namePlaceholder")}
                            className="h-12 rounded-xl bg-muted/50 border-border/50 focus:border-primary/50 transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-medium">
                            {t("contact.form.email")} <span className="text-primary">*</span>
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange("email", e.target.value)}
                            required
                            placeholder={t("contact.form.emailPlaceholder")}
                            className="h-12 rounded-xl bg-muted/50 border-border/50 focus:border-primary/50 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-sm font-medium">
                            {t("contact.form.phone")}
                          </Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleChange("phone", e.target.value)}
                            placeholder={t("contact.form.phonePlaceholder")}
                            className="h-12 rounded-xl bg-muted/50 border-border/50 focus:border-primary/50 transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="subject" className="text-sm font-medium">
                            {t("contact.form.subject")} <span className="text-primary">*</span>
                          </Label>
                          <Select
                            value={formData.subject}
                            onValueChange={(value) => handleChange("subject", value)}
                            required
                          >
                            <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-border/50 focus:border-primary/50">
                              <SelectValue placeholder={t("contact.form.subjectPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="support">{t("contact.form.subjects.support")}</SelectItem>
                              <SelectItem value="sales">{t("contact.form.subjects.sales")}</SelectItem>
                              <SelectItem value="partnership">{t("contact.form.subjects.partnership")}</SelectItem>
                              <SelectItem value="other">{t("contact.form.subjects.other")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-sm font-medium">
                          {t("contact.form.message")} <span className="text-primary">*</span>
                        </Label>
                        <Textarea
                          id="message"
                          value={formData.message}
                          onChange={(e) => handleChange("message", e.target.value)}
                          required
                          rows={5}
                          placeholder={t("contact.form.messagePlaceholder")}
                          className="rounded-xl bg-muted/50 border-border/50 focus:border-primary/50 transition-colors resize-none"
                        />
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-14 text-base font-semibold rounded-xl gradient-primary hover:opacity-90 transition-opacity group"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-3">
                            <span className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
                            {t("contact.form.submitting")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-3">
                            <Send className="w-5 h-5" />
                            {t("contact.form.submit")}
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Contact Info - Takes 2 columns */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="lg:col-span-2 space-y-8"
            >
              {/* Contact Cards */}
              <div>
                <h2 className="text-xl font-bold mb-6">{t("contact.info.title")}</h2>
                <div className="space-y-4">
                  {contactInfo.map((item, index) => (
                    <motion.div
                      key={item.labelKey}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 * index }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      className="group relative"
                    >
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all cursor-pointer">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                          <item.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-muted-foreground mb-0.5">
                            {t(item.labelKey)}
                          </p>
                          {item.href ? (
                            <a
                              href={item.href}
                              className="text-foreground font-semibold hover:text-primary transition-colors truncate block"
                            >
                              {item.value}
                            </a>
                          ) : (
                            <p className="text-foreground font-semibold truncate">{item.value}</p>
                          )}
                        </div>
                        {item.href && (
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Social Links */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                <h3 className="text-lg font-semibold mb-4">{t("contact.social.title")}</h3>
                <div className="flex gap-3">
                  {socialLinks.map((social, index) => (
                    <motion.a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      whileHover={{ scale: 1.1, y: -3 }}
                      whileTap={{ scale: 0.95 }}
                      className={`w-14 h-14 rounded-2xl bg-card border border-border/50 flex items-center justify-center transition-all text-muted-foreground ${social.color}`}
                      title={social.label}
                    >
                      <social.icon className="w-6 h-6" />
                    </motion.a>
                  ))}
                </div>
              </motion.div>

              {/* Quick Contact CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.7 }}
                className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 border border-primary/20"
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl" />
                <div className="relative">
                  <h4 className="font-bold mb-2">{t("contact.quickContact.title", "Cần hỗ trợ ngay?")}</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("contact.quickContact.description", "Chat trực tiếp với đội ngũ hỗ trợ của chúng tôi")}
                  </p>
                  <Button 
                    size="sm" 
                    className="gradient-primary hover:opacity-90 rounded-xl"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    {t("contact.quickContact.button", "Bắt đầu chat")}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Teaser Section */}
      <section className="py-16 border-t border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              {t("contact.faq.title", "Câu hỏi thường gặp")}
            </h2>
            <p className="text-muted-foreground mb-8">
              {t("contact.faq.description", "Tìm câu trả lời nhanh cho các thắc mắc phổ biến")}
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: "💰", label: t("contact.faq.pricing", "Bảng giá dịch vụ") },
                { icon: "🚀", label: t("contact.faq.features", "Tính năng sản phẩm") },
                { icon: "🔒", label: t("contact.faq.security", "Bảo mật & Quyền riêng tư") },
              ].map((item, index) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all text-left"
                >
                  <span className="text-2xl mb-2 block">{item.icon}</span>
                  <span className="font-medium text-sm">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
