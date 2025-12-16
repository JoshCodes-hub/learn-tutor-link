import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Adebayo Olamide",
    department: "Computer Science",
    rating: 5,
    review: "OverraPrep AI transformed my exam preparation. The CBT simulation mode helped me get comfortable with the actual exam format, and I scored much higher than expected!",
  },
  {
    name: "Chidinma Eze",
    department: "Mechanical Engineering",
    rating: 5,
    review: "The AI explanations are incredibly helpful. Whenever I get a question wrong, I actually understand why. It is like having a personal tutor available 24/7.",
  },
  {
    name: "Tunde Bakare",
    department: "Electrical Engineering",
    rating: 4,
    review: "I love how the platform tracks my weak areas. The personalized recommendations helped me focus on topics I was struggling with. Highly recommend!",
  },
  {
    name: "Funke Adeyemi",
    department: "Civil Engineering",
    rating: 5,
    review: "The tutor-created quizzes are top-notch quality. Worth every token! My grades have improved significantly since I started using OverraPrep.",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            Student Stories
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            What Our Students Say
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join thousands of FUTA students who have improved their exam performance with OverraPrep AI
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-6">
                <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10" />
                
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < testimonial.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted"
                      }`}
                    />
                  ))}
                </div>

                <p className="text-muted-foreground mb-6 leading-relaxed">
                  "{testimonial.review}"
                </p>

                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {testimonial.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.department}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
