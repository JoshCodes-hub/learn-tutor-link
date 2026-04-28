import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, ArrowLeft, Lock, Database, Eye, Cookie, Globe, Mail, UserMinus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SiteFooter from "@/components/layout/SiteFooter";

const sections = [
  { icon: Database, title: "1. What we collect", body: "Account info (name, email, school/department, profile image), academic activity (quiz attempts, scores, study streaks), tutor content you create, device & log data (IP, user agent, timestamps) for security and abuse prevention." },
  { icon: Eye, title: "2. How we use your data", body: "To deliver and personalize your learning experience, generate AI explanations and recommendations, issue verified report cards, send notifications you've opted into, and improve platform reliability and safety." },
  { icon: Globe, title: "3. Sharing", body: "We do not sell personal data. Limited sharing occurs with: (a) Lovable Cloud (hosting, database), (b) Resend (transactional email), (c) AI providers (Google Gemini, OpenAI) only for prompts you initiate. Schools see student data they manage; tutors see aggregated stats only." },
  { icon: Lock, title: "4. Security", body: "All traffic is encrypted in transit (TLS). Passwords are hashed and checked against the Have-I-Been-Pwned breach database. Row-Level Security policies isolate data between users, schools, and tutors. Service role keys are restricted to backend functions." },
  { icon: Cookie, title: "5. Cookies & local storage", body: "We store an authentication session token, your selected academic path, and onboarding tour progress in your browser. We do not use third-party advertising cookies." },
  { icon: UserMinus, title: "6. Your rights (GDPR / NDPR)", body: "You may access, correct, export, or delete your data at any time from Settings → Privacy. Deletion permanently removes your profile, attempts, bookmarks, and content within 30 days; report cards already issued by your school may be retained for academic record-keeping." },
  { icon: Shield, title: "7. Children's privacy", body: "Users under 13 are not permitted. Users 13–17 require verified parental or guardian consent. Schools onboarding minor students confirm they have obtained the necessary consents." },
  { icon: Mail, title: "8. Contact", body: "Questions or data requests? Email privacy@overraprep.com — we respond within 7 business days." },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-50/30">
      <div className="container max-w-4xl mx-auto px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30 mb-4">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">Your data, your control. Last updated April 28, 2026.</p>
        </motion.div>

        <div className="grid gap-4">
          {sections.map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="p-6 border-amber-100/60 hover:shadow-lg hover:shadow-amber-500/10 transition group">
                <div className="flex gap-4">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200/60 border border-amber-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                    <s.icon className="h-5 w-5 text-amber-700" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-semibold mb-2">{s.title}</h2>
                    <p className="text-muted-foreground leading-relaxed">{s.body}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="mt-8 p-6 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <h3 className="font-serif text-lg font-semibold mb-2 flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-amber-700" /> Delete your account
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            You can permanently delete your OverraPrep account and all associated personal data at any time.
          </p>
          <Button asChild className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white">
            <Link to="/settings/privacy">Manage privacy settings</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
