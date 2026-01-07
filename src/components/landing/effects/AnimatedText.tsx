import { motion } from "framer-motion";

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export function AnimatedText({ text, className = "", delay = 0 }: AnimatedTextProps) {
  const words = text.split(" ");

  return (
    <span className={className}>
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block">
          {word.split("").map((char, charIndex) => (
            <motion.span
              key={`${wordIndex}-${charIndex}`}
              className="inline-block"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: delay + (wordIndex * 0.1) + (charIndex * 0.02),
                ease: [0.215, 0.61, 0.355, 1],
              }}
            >
              {char}
            </motion.span>
          ))}
          <span>&nbsp;</span>
        </span>
      ))}
    </span>
  );
}

export function GlowingText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`relative ${className}`}>
      <span className="relative z-10">{children}</span>
      <motion.span
        className="absolute inset-0 blur-2xl bg-gradient-to-r from-primary/30 to-secondary/30 -z-10"
        animate={{
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </span>
  );
}

export function TypewriterText({ text, className = "", speed = 50 }: { text: string; className?: string; speed?: number }) {
  return (
    <motion.span
      className={className}
      initial={{ width: 0 }}
      animate={{ width: "auto" }}
      transition={{
        duration: (text.length * speed) / 1000,
        ease: "linear",
      }}
      style={{ overflow: "hidden", display: "inline-block", whiteSpace: "nowrap" }}
    >
      {text}
    </motion.span>
  );
}
