import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FAQSEOSchema } from "@/components/SEOHead";

export function FAQSection() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = t("faq.items", { returnObjects: true }) as Array<{ question: string; answer: string }>;

  return (
    <section id="faq" className="py-24 lg:py-32">
      <FAQSEOSchema faqs={faqs} />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t("faq.title")} <span className="text-primary">{t("faq.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground">
            {t("faq.subtitle")}
          </p>
        </motion.div>

        {/* FAQ List */}
        <div className="max-w-2xl mx-auto space-y-3">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  openIndex === index 
                    ? "border-primary/30 bg-muted/30" 
                    : "border-border hover:border-primary/20"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className={`font-semibold transition-colors ${
                    openIndex === index ? "text-primary" : "text-foreground"
                  }`}>
                    {faq.question}
                  </h3>
                  <ChevronDown 
                    className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      openIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </div>
                
                <AnimatePresence initial={false}>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="pt-3 text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          ))}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground">
            {t("faq.contactPrompt")}{" "}
            <a href="mailto:support@flowa.vn" className="text-primary hover:underline font-medium">
              {t("faq.contactLink")}
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
