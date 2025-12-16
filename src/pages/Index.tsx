import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import FeaturedTutorsSection from "@/components/landing/FeaturedTutorsSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FAQSection from "@/components/landing/FAQSection";
import TutorSection from "@/components/landing/TutorSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/layout/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <FeaturedTutorsSection />
        <TestimonialsSection />
        <FAQSection />
        <TutorSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
