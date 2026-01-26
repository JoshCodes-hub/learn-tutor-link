import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Quote, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import studentFemale from "@/assets/student-female.jpg";
import studentMale from "@/assets/student-male.jpg";

const testimonials = [
  {
    name: "Adebayo Olamide",
    department: "Computer Science",
    level: "400 Level",
    rating: 5,
    review: "OverraPrep AI transformed my exam preparation. The CBT simulation mode helped me get comfortable with the actual exam format, and I scored much higher than expected!",
    gradient: "from-blue-500 to-cyan-500",
    image: studentMale,
  },
  {
    name: "Chidinma Eze",
    department: "Mechanical Engineering",
    level: "300 Level",
    rating: 5,
    review: "The AI explanations are incredibly helpful. Whenever I get a question wrong, I actually understand why. It's like having a personal tutor available 24/7.",
    gradient: "from-purple-500 to-pink-500",
    image: studentFemale,
  },
  {
    name: "Tunde Bakare",
    department: "Electrical Engineering",
    level: "200 Level",
    rating: 5,
    review: "I love how the platform tracks my weak areas. The personalized recommendations helped me focus on topics I was struggling with. Highly recommend!",
    gradient: "from-primary to-teal-500",
  },
  {
    name: "Funke Adeyemi",
    department: "Civil Engineering",
    level: "500 Level",
    rating: 5,
    review: "The tutor-created quizzes are top-notch quality. Worth every token! My grades have improved significantly since I started using OverraPrep.",
    gradient: "from-accent to-orange-500",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
};

const TestimonialsSection = () => {
  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-gradient-mesh opacity-20" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-12 lg:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-success/10 border border-success/20 rounded-full px-4 py-2 mb-6">
            <MessageSquare className="w-4 h-4 text-success" />
            <span className="text-sm font-semibold text-foreground">Student Stories</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            What Our Students <span className="text-gradient-primary">Say</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of FUTA students who have improved their exam performance with OverraPrep AI
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div 
          className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div 
              key={index} 
              className="group glass-card glass-card-hover rounded-2xl p-6 lg:p-8 relative overflow-hidden"
              variants={cardVariants}
              whileHover={{ y: -4 }}
            >
              {/* Quote icon */}
              <Quote className="absolute top-6 right-6 w-10 h-10 text-primary/10 group-hover:text-primary/20 transition-colors" />
              
              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * i }}
                  >
                    <Star
                      className={`w-5 h-5 ${
                        i < testimonial.rating
                          ? "fill-accent text-accent"
                          : "text-muted"
                      }`}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Review */}
              <p className="text-foreground mb-6 leading-relaxed text-lg">
                "{testimonial.review}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12 ring-2 ring-border">
                  {testimonial.image ? (
                    <AvatarImage 
                      src={testimonial.image} 
                      alt={testimonial.name}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className={`bg-gradient-to-br ${testimonial.gradient} text-white font-bold`}>
                    {testimonial.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-display font-bold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.department} • {testimonial.level}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust indicators */}
        <motion.div 
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-4 sm:gap-8 p-4 sm:p-6 glass-card rounded-2xl">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                ))}
              </div>
              <span className="font-bold text-foreground">4.9/5</span>
            </div>
            <div className="h-6 w-px bg-border hidden sm:block" />
            <p className="text-muted-foreground">
              Based on <span className="font-semibold text-foreground">1,000+</span> reviews
            </p>
            <div className="h-6 w-px bg-border hidden sm:block" />
            <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
              Verified Students
            </Badge>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
