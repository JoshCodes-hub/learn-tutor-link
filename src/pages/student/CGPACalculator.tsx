import AppScreen from "@/components/app-shell/AppScreen";
import { Calculator, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";

const CGPACalculator = () => {
  const navigate = useNavigate();
  return (
    <>
      <SEO title="CGPA Calculator" description="Calculate your CGPA quickly and accurately." noindex />
      <AppScreen title="CGPA Calculator" subtitle="Coming soon">
        <div className="max-w-xl mx-auto text-center py-10">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center mb-5 shadow-[0_8px_24px_-12px_rgba(244,63,94,0.4)]">
            <Calculator className="h-9 w-9 text-rose-600" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">CGPA Calculator</h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            We're polishing a beautiful, accurate CGPA calculator with course units, grade points, and cumulative tracking. Stay tuned.
          </p>
          <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Launching soon
          </div>
          <div className="mt-8">
            <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
          </div>
        </div>
      </AppScreen>
    </>
  );
};

export default CGPACalculator;
