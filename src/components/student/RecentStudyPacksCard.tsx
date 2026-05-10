import { useNavigate } from "react-router-dom";
import { FileText, ChevronRight, FolderOpen } from "lucide-react";

export const RecentStudyPacksCard = () => {
  const navigate = useNavigate();

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-4 sm:p-5 shadow-[0_4px_18px_-12px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm sm:text-[15px] font-bold text-foreground">Recent Study Packs</h3>
        <button
          type="button"
          onClick={() => navigate("/study-packs")}
          className="text-[11px] font-semibold text-amber-700 hover:text-amber-800"
        >
          See all
        </button>
      </div>

      <div className="flex flex-col items-center justify-center text-center py-6 px-2">
        <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-2">
          <FolderOpen className="w-6 h-6 text-amber-600" />
        </div>
        <p className="text-[13px] font-semibold text-foreground">No study packs yet</p>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-[24ch]">
          Upload your first document to generate summaries, quizzes & audio.
        </p>
        <button
          type="button"
          onClick={() => navigate("/study-hub?upload=1")}
          className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[11px] font-bold hover:bg-amber-600 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" /> Generate Pack <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default RecentStudyPacksCard;
