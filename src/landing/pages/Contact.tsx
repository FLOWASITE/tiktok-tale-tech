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
import { SEOHead } from "@/components/SEOHead";

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
    
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    toast.success(t("contact.form.success"));
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    setIsSubmitting(false);
    setIsSubmitted(true);
    
    setTimeout(() => setIsSubmitted(false), 5000);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <PublicPageLayout>
      <SEOHead
        title="Liên Hệ Flowa - Tư Vấn Content Marketing AI"
        description="Liên hệ Flowa để được tư vấn giải pháp content marketing đa kênh với AI. Email, điện thoại, hoặc đặt lịch demo."
        canonicalPath="/contact"
      />
      {/* Hero Section - Simple */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {t("contact.title")}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t("contact.subtitle")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Form & Info Section */}
      <section className="pb-16 lg:pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-2"
            >
              <div className="bg-card rounded-2xl p-6 md:p-8 border border-border shadow-sm">
                <h2 className="text-xl font-semibold mb-6">{t("contact.form.title")}</h2>
                
                {isSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {t("contact.form.successTitle", "Gửi thành công!")}
                    </h3>
                    <p className="text-muted-foreground max-w-sm">
                      {t("contact.form.successMessage", "Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.")}
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="name">
                          {t("contact.form.name")} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleChange("name", e.target.value)}
                          required
                          placeholder={t("contact.form.namePlaceholder")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          {t("contact.form.email")} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleChange("email", e.target.value)}
                          required
                          placeholder={t("contact.form.emailPlaceholder")}
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="phone">
                          {t("contact.form.phone")}
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleChange("phone", e.target.value)}
                          placeholder={t("contact.form.phonePlaceholder")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">
                          {t("contact.form.subject")} <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.subject}
                          onValueChange={(value) => handleChange("subject", value)}
                          required
                        >
                          <SelectTrigger>
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
                      <Label htmlFor="message">
                        {t("contact.form.message")} <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => handleChange("message", e.target.value)}
                        required
                        rows={5}
                        placeholder={t("contact.form.messagePlaceholder")}
                        className="resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                          {t("contact.form.submitting")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          {t("contact.form.submit")}
                        </span>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </motion.div>

            {/* Contact Info Sidebar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-6"
            >
              {/* Contact Info */}
              <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                <h2 className="text-lg font-semibold mb-4">{t("contact.info.title")}</h2>
                <div className="space-y-4">
                  {contactInfo.map((item) => (
                    <div key={item.labelKey} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">
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
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                <h2 className="text-lg font-semibold mb-4">{t("contact.social.title")}</h2>
                <div className="flex gap-3">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted hover:border-primary/30 transition-colors"
                      aria-label={social.label}
                    >
                      <social.icon className="w-5 h-5" />
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
