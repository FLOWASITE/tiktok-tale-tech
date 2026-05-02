import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FAQSEOSchema } from "@/components/SEOHead";

interface SeoFAQProps {
  faqs: Array<{ question: string; answer: string }>;
  title?: string;
  emitSchema?: boolean;
}

/**
 * Accessible FAQ accordion that ALSO emits FAQPage schema.
 * Used inside DynamicLandingPage and any GEO-targeted page.
 */
export function SeoFAQ({ faqs, title = "Câu hỏi thường gặp", emitSchema = true }: SeoFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  if (!faqs?.length) return null;

  return (
    <section data-geo-block="faq" className="my-12">
      {emitSchema && <FAQSEOSchema faqs={faqs} />}
      <h2 className="mb-6 text-2xl font-semibold sm:text-3xl">{title}</h2>
      <div className="space-y-3">
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i} className="rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 p-4 text-left"
              >
                <h3 className={`font-semibold ${isOpen ? "text-primary" : ""}`}>{faq.question}</h3>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="px-4 pb-4 text-muted-foreground leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: faq.answer }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
