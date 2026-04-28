import { SEO } from "@/components/seo/SEO";
import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import TrustStrip from "@/components/landing/TrustStrip";
import StatsSection from "@/components/landing/StatsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import FeaturedTutorsSection from "@/components/landing/FeaturedTutorsSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FAQSection from "@/components/landing/FAQSection";
import TutorSection from "@/components/landing/TutorSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/layout/Footer";
import OnboardingTour from "@/components/onboarding/OnboardingTour";

const homepageStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "OverraPrep AI",
  url: "https://overraprepaifuta.vercel.app/",
  description: "AI-powered CBT exam preparation platform for FUTA students",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://overraprep.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
  publisher: {
    "@type": "Organization",
    name: "OverraPrep AI",
    logo: {
      "@type": "ImageObject",
      url: "https://overraprepaifuta.vercel.app/assets/logo-B4OzJs9a.png",
    },
  },
};

const Index = () => {
  return (
    <>
      <SEO
        title="AI-Powered CBT Exam Preparation"
        description="Ace your FUTA CBT exams with AI-powered practice questions, instant explanations, and personalized learning paths."
        keywords="FUTA, CBT, exam preparation, past questions, AI tutoring"
        url="https://overraprepaifuta.vercel.app/website"
        structuredData={homepageStructuredData}
        noindex
      />
      <OnboardingTour />
      <div className="min-h-screen">
        <Navbar />
        <main role="main" aria-label="Main content">
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
    </>
  );
};

export default Index;
