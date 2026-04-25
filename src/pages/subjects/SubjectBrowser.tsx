import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AcademicPath } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Subject {
  id: string;
  name: string;
  category: AcademicPath;
  level: string | null;
  description: string | null;
}

export default function SubjectBrowser() {
  const { profile, primaryRole, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Default to user's path; secondary users see secondary, JAMB users see JAMB
  const path: AcademicPath = profile?.academic_path === "jamb" ? "jamb" : "secondary";

  useEffect(() => {
    supabase
      .from("subjects")
      .select("*")
      .eq("category", path)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        setSubjects((data || []) as Subject[]);
        setLoading(false);
      });
  }, [path]);

  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  if (authLoading) return <LoadingSpinner />;

  return (
    <>
      <SEO
        title={`${path === "jamb" ? "JAMB" : "WAEC / NECO"} Subjects | OverraPrep AI`}
        description="Browse subjects and start learning at your own pace."
      />
      <main className="min-h-screen bg-background">
        <DashboardNav role={(primaryRole as any) || "student"} />
        <div className="container mx-auto px-4 py-6">
          <DashboardBreadcrumb />

          <div className="mt-4 mb-8">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-3">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              {path === "jamb" ? "JAMB / UTME Subjects" : "WAEC / NECO Subjects"}
            </h1>
            <p className="text-muted-foreground">
              Pick a subject to start practicing, build flashcards, or get AI explanations.
            </p>
          </div>

          <div className="relative max-w-md mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subjects…"
              className="pl-9"
            />
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No subjects found.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Link
                    to={`/flashcards?subject=${encodeURIComponent(s.name)}`}
                    className="block rounded-xl border bg-card p-4 hover:border-primary/50 hover:shadow-lg transition-all h-full"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm leading-snug">{s.name}</h3>
                    {s.level && (
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">
                        {s.level}
                      </p>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
