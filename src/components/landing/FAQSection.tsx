import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const faqs = [
  {
    question: "What is OverraPrep AI?",
    answer:
      "OverraPrep AI is an AI-powered CBT exam preparation platform designed specifically for FUTA students. It combines practice quizzes, AI-powered explanations, and a tutor marketplace where verified tutors create premium quiz content to help you excel in your exams.",
  },
  {
    question: "How do tokens work?",
    answer:
      "Tokens are the platform currency used to access premium quiz content. New users receive free tokens upon signup. You can purchase additional tokens through bank transfer, and once approved by admin, tokens are credited to your wallet. Use tokens to unlock premium quizzes created by verified tutors.",
  },
  {
    question: "What is the difference between Practice Mode and CBT Simulation?",
    answer:
      "Practice Mode allows untimed learning with immediate feedback after each question - perfect for studying. CBT Simulation Mode recreates actual exam conditions with timed sessions, no immediate feedback, and results shown only at the end - ideal for testing your readiness.",
  },
  {
    question: "How do I become a tutor?",
    answer:
      "To become a tutor, click 'Become a Tutor' and submit an application with your qualifications, experience, and courses you want to teach. Admin reviews all applications and approves qualified tutors. Once approved, you can create quizzes, set prices, and earn from student purchases.",
  },
  {
    question: "How do tutor earnings work?",
    answer:
      "When students purchase your quizzes, earnings are automatically calculated and split between you and the platform. You can view your earnings dashboard and request withdrawals once you reach the minimum threshold. Withdrawals are processed manually by admin to your bank account.",
  },
  {
    question: "Are the AI explanations available for all questions?",
    answer:
      "Yes! Our AI-powered explanations provide step-by-step breakdowns for every question. When you get a question wrong (or right), you can request an AI explanation to understand the concept better - like having a personal tutor available 24/7.",
  },
  {
    question: "Can I track my progress?",
    answer:
      "Absolutely! The platform tracks your performance including accuracy rates, speed, weak areas, and improvement over time. Your dashboard shows detailed analytics to help you focus on topics that need more attention.",
  },
  {
    question: "Is my payment information secure?",
    answer:
      "We use a manual payment verification system. You make a bank transfer and submit the payment reference. Admin verifies the payment before crediting tokens to your account. Your financial details are never stored on our platform.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-16 sm:py-20 bg-muted/30 scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 sm:mb-12">
          <Badge variant="outline" className="mb-4">
            FAQ
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            Got questions? We have answers. Find everything you need to know about OverraPrep AI.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3 sm:space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-lg px-4 sm:px-6 data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline py-3 sm:py-4 text-sm sm:text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-3 sm:pb-4 text-sm sm:text-base">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
