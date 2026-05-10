import AppScreen from "@/components/app-shell/AppScreen";
import { FolderOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";

const StudyPacks = () => {
  const navigate = useNavigate();
  return (
    <>
      <SEO title="My Study Packs" description="Your AI-generated study packs — summaries, quizzes, flashcards and audio." noindex />
      <AppScreen title="Study Packs" subtitle="Your AI-generated learning kits">
        <div className="max-w-xl mx-auto text-center py-10">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center mb-5 shadow-[0_8px_24px_-12px_rgba(180,140,40,0.4)]">
            <FolderOpen className="h-9 w-9 text-amber-700" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">No study packs yet</h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Upload a document or paste your notes — we'll generate summaries, quizzes, flashcards and audio in seconds.
          </p>
          <div className="mt-6 flex justify-center gap-2.5 flex-wrap">
            <Button onClick={() => navigate("/study-hub?upload=1")} className="bg-amber-500 hover:bg-amber-600">
              <Sparkles className="w-4 h-4 mr-1.5" /> Generate Pack
            </Button>
            <Button variant="outline" onClick={() => navigate("/study-hub")}>Open Study Hub</Button>
          </div>
        </div>
      </AppScreen>
    </>
  );
};

export default StudyPacks;
