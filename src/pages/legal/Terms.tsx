import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ScrollText, ArrowLeft, Shield, Scale, AlertTriangle, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SiteFooter from "@/components/layout/SiteFooter";

const sections = [
  { id: "acceptance", title: "1. Acceptance of Terms", body: "By creating an account or using OverraPrep AI, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please discontinue use of the platform immediately." },
  { id: "eligibility", title: "2. Eligibility", body: "You must be at least 13 years old to register. Users under 18 must have parental or guardian consent. Schools and tutors confirm they are authorized representatives of their institutions." },
  { id: "accounts", title: "3. Accounts & Security", body: "You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. Notify us immediately of any unauthorized access." },
  { id: "content", title: "4. User-Generated Content", body: "Tutors retain ownership of quizzes and study materials they create but grant OverraPrep a non-exclusive license to host, display, and distribute that content within the platform. Plagiarized or infringing content will be removed." },
  { id: "conduct", title: "5. Acceptable Use", body: "You agree not to: (a) cheat, share answers, or use unauthorized aids during exams; (b) harass other users; (c) attempt to bypass security or rate limits; (d) scrape, mirror, or commercially redistribute platform content." },
  { id: "ai", title: "6. AI-Generated Content", body: "Explanations, summaries, and recommendations powered by AI are provided for educational support and may contain inaccuracies. Always verify critical information with your school curriculum or a qualified instructor." },
  { id: "schools", title: "7. School & Report Card Verification", body: "Verified report cards issued through OverraPrep are tamper-evident records of student performance for the period stated. Schools are solely responsible for the accuracy of underlying scores entered." },
  { id: "termination", title: "8. Termination", body: "We may suspend or terminate accounts that violate these Terms. You may request account deletion at any time from Settings → Privacy. Deletion is irreversible." },
  { id: "liability", title: "9. Limitation of Liability", body: "OverraPrep is provided on an \"as is\" basis. We are not liable for exam outcomes, lost data, or indirect damages arising from use of the platform." },
  { id: "changes", title: "10. Changes to Terms", body: "We may update these Terms periodically. Material changes will be communicated via in-app notification at least 7 days before taking effect." },
  { id: "contact", title: "11. Contact", body: "Questions about these Terms? Reach us at legal@overraprep.com." },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-50/30">
      <div className="container max-w-4xl mx-auto px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30 mb-4">
            <Scale className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-muted-foreground mt-2">Last updated: April 28, 2026 · Effective immediately</p>
        </motion.div>

        <Card className="p-6 md:p-10 border-amber-100/60 shadow-xl shadow-amber-500/5 backdrop-blur">
          <div className="grid md:grid-cols-[200px_1fr] gap-8">
            <nav className="hidden md:block sticky top-6 self-start">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Sections</p>
              <ul className="space-y-2 text-sm">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="text-muted-foreground hover:text-amber-700 transition block">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-8">
              {sections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-6">
                  <h2 className="font-serif text-2xl font-semibold mb-3 flex items-center gap-2">
                    <ScrollText className="h-5 w-5 text-amber-600" />
                    {s.title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">{s.body}</p>
                </section>
              ))}

              <div className="pt-6 border-t border-amber-100/60 flex flex-wrap gap-3">
                <Button asChild variant="outline" className="border-amber-200">
                  <Link to="/privacy"><Shield className="h-4 w-4 mr-2" />Privacy Policy</Link>
                </Button>
                <Button asChild variant="outline" className="border-amber-200">
                  <a href="mailto:legal@overraprep.com"><Mail className="h-4 w-4 mr-2" />Contact Legal</a>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-amber-50/60 border border-amber-200/60">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900/80">
            This is a binding agreement between you and OverraPrep AI. Please read carefully before continuing.
          </p>
        </div>
      </div>
    </div>
  );
}
