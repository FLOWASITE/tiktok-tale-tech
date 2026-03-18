import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Star, Quote } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMemo } from "react";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  avatar: string;
  content: string;
  rating: number;
}

function TestimonialCard({ testimonial, index }: { testimonial: Testimonial; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="flex-shrink-0 w-[350px] mx-3"
    >
      <div className="relative group h-full">
        {/* Glassmorphism Card */}
        <div className="relative h-full p-6 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/50 hover:border-primary/40 transition-all duration-500 hover:shadow-[0_8px_32px_rgba(var(--primary),0.15)]">
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Quote Icon with Gradient */}
          <div className="absolute -top-3 -left-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <Quote className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 pt-4">
            {/* Stars with stagger animation */}
            <div className="flex gap-1 mb-4">
              {Array.from({ length: testimonial.rating }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                </motion.div>
              ))}
            </div>

            {/* Quote */}
            <p className="text-sm text-foreground/90 leading-relaxed mb-6 line-clamp-4">
              "{testimonial.content}"
            </p>

            {/* Author */}
            <div className="flex items-center gap-3">
              {/* Avatar with Ring Glow */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-secondary blur-sm opacity-50 group-hover:opacity-80 transition-opacity" />
                <Avatar className="relative w-10 h-10 border-2 border-background">
                  <AvatarImage src={testimonial.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-semibold text-xs">
                    {testimonial.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <div className="font-medium text-foreground text-sm">
                  {testimonial.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {testimonial.role} @ {testimonial.company}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function TestimonialsSection() {
  const { t } = useTranslation();

  const testimonialItems = t("testimonials.items", { returnObjects: true }) as Array<{
    quote: string;
    name: string;
    role: string;
    company: string;
  }>;

  const testimonials: Testimonial[] = useMemo(() => {
    if (!Array.isArray(testimonialItems)) return [];
    return testimonialItems.map((item, index) => ({
      id: index + 1,
      name: item.name,
      role: item.role,
      company: item.company,
      avatar: "",
      content: item.quote,
      rating: 5,
    }));
  }, [testimonialItems]);

  // Duplicate for seamless loop
  const duplicatedTestimonials = [...testimonials, ...testimonials];
  const reversedTestimonials = useMemo(() => [...duplicatedTestimonials].reverse(), [duplicatedTestimonials]);

  return (
    <section id="testimonials" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-muted/30" />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-secondary/10 blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-medium text-primary">{t("testimonials.badge")}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            {t("testimonials.title")}
            <br />
            <span className="text-gradient">{t("testimonials.titleHighlight")}</span>
          </h2>
        </motion.div>

        {/* Infinite Marquee - Row 1 (Left to Right) */}
        <div className="relative mb-6 overflow-hidden">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              duration: 40,
              repeat: Infinity,
              ease: "linear",
            }}
            className="flex"
          >
            {duplicatedTestimonials.map((testimonial, index) => (
              <TestimonialCard key={`row1-${index}`} testimonial={testimonial} index={index} />
            ))}
          </motion.div>
        </div>

        {/* Infinite Marquee - Row 2 (Right to Left) */}
        <div className="relative overflow-hidden">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          
          <motion.div
            animate={{ x: ["-50%", "0%"] }}
            transition={{
              duration: 40,
              repeat: Infinity,
              ease: "linear",
            }}
            className="flex"
          >
            {reversedTestimonials.map((testimonial, index) => (
              <TestimonialCard key={`row2-${index}`} testimonial={testimonial} index={index} />
            ))}
          </motion.div>
        </div>

        {/* Company Logos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-16 lg:mt-24"
        >
          <p className="text-center text-sm text-muted-foreground mb-8">
            {t("hero.trustBadge")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-6">
            {["Agency", "E-commerce", "Healthcare", "F&B", "Education", "Real Estate"].map((industry, i) => (
              <motion.div 
                key={industry} 
                className="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground/60 bg-muted/30 border border-border/30 hover:text-primary/70 hover:border-primary/30 transition-colors cursor-default"
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                {industry}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
