import { motion } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    id: 1,
    name: "Nguyễn Minh Anh",
    role: "Marketing Manager",
    company: "TechVN",
    avatar: "",
    content: "Flowa đã giúp team marketing của chúng tôi tiết kiệm hơn 20 giờ mỗi tuần. Chất lượng nội dung AI tạo ra vượt xa kỳ vọng, đặc biệt là khả năng giữ đúng giọng điệu thương hiệu.",
    rating: 5,
  },
  {
    id: 2,
    name: "Trần Hoàng Long",
    role: "CEO",
    company: "StartupHub",
    avatar: "",
    content: "Là startup với nguồn lực hạn chế, Flowa giúp chúng tôi có thể sản xuất nội dung chất lượng như các công ty lớn. ROI tăng 300% sau 3 tháng sử dụng.",
    rating: 5,
  },
  {
    id: 3,
    name: "Phạm Thu Hà",
    role: "Content Director",
    company: "MediaPro Agency",
    avatar: "",
    content: "Quản lý nội dung cho 15+ client chưa bao giờ dễ dàng đến thế. Brand voice consistency là điểm mạnh nhất của Flowa - mỗi client đều có giọng điệu riêng biệt.",
    rating: 5,
  },
  {
    id: 4,
    name: "Lê Văn Đức",
    role: "Digital Marketing Lead",
    company: "FashionVN",
    avatar: "",
    content: "Campaign management của Flowa rất trực quan. Chúng tôi có thể theo dõi mọi thứ từ content đến performance trong một dashboard duy nhất.",
    rating: 5,
  },
  {
    id: 5,
    name: "Võ Thị Lan",
    role: "Brand Manager",
    company: "CosmeticPlus",
    avatar: "",
    content: "Multi-channel publishing tiết kiệm rất nhiều thời gian. Trước đây phải copy-paste giữa các platform, giờ chỉ cần 1 click là xong.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section id="testimonials" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-muted/30" />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-3xl"
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
            <span className="text-sm font-medium text-primary">Đánh giá</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Được tin dùng bởi
            <br />
            <span className="text-gradient">hàng nghìn doanh nghiệp</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Xem những gì khách hàng nói về trải nghiệm sử dụng Flowa
          </p>
        </motion.div>

        {/* Testimonials Carousel */}
        <div className="relative max-w-4xl mx-auto">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-card border border-border/50 rounded-2xl p-8 lg:p-12 relative"
          >
            {/* Quote Icon */}
            <Quote className="absolute top-8 left-8 w-12 h-12 text-primary/20" />

            {/* Content */}
            <div className="relative z-10">
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {Array.from({ length: testimonials[currentIndex].rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-lg lg:text-xl text-foreground leading-relaxed mb-8">
                "{testimonials[currentIndex].content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12 border-2 border-primary/20">
                  <AvatarImage src={testimonials[currentIndex].avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {testimonials[currentIndex].name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-foreground">
                    {testimonials[currentIndex].name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonials[currentIndex].role} @ {testimonials[currentIndex].company}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={prevTestimonial}
              className="rounded-full"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? "bg-primary w-6"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={nextTestimonial}
              className="rounded-full"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
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
            Được tin dùng bởi các thương hiệu hàng đầu
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16 opacity-50">
            {["TechVN", "StartupHub", "MediaPro", "FashionVN", "CosmeticPlus"].map((company) => (
              <div key={company} className="text-xl font-bold text-muted-foreground">
                {company}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
