import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface QuestionReport {
  id: string;
  question_id: string;
  reporter_id: string;
  reason: string;
  description: string | null;
  status: string;
  tutor_notes: string | null;
  created_at: string;
  question?: {
    question_text: string;
    correct_option: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
  };
}

const REASON_LABELS: Record<string, string> = {
  incorrect_answer: "Incorrect answer",
  unclear_question: "Unclear question",
  typo_error: "Typo/Grammar",
  wrong_options: "Wrong options",
  outdated_content: "Outdated content",
  other: "Other",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-accent/20 text-accent", icon: Clock },
  reviewed: { label: "Reviewed", color: "bg-primary/20 text-primary", icon: MessageSquare },
  resolved: { label: "Resolved", color: "bg-success/20 text-success", icon: CheckCircle2 },
  dismissed: { label: "Dismissed", color: "bg-muted text-muted-foreground", icon: XCircle },
};

const QuestionReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchReports();
  }, [user]);

  const fetchReports = async () => {
    if (!user) return;

    try {
      // Fetch reports on tutor's questions
      const { data: reportsData, error } = await supabase
        .from("question_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch question details for each report
      if (reportsData && reportsData.length > 0) {
        const questionIds = [...new Set(reportsData.map((r) => r.question_id))];
        const { data: questionsData } = await supabase
          .from("questions")
          .select("id, question_text, correct_option, option_a, option_b, option_c, option_d")
          .in("id", questionIds);

        const questionsMap = questionsData?.reduce((acc, q) => {
          acc[q.id] = q;
          return acc;
        }, {} as Record<string, any>) || {};

        setReports(
          reportsData.map((r) => ({
            ...r,
            question: questionsMap[r.question_id],
          }))
        );
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    setUpdatingId(reportId);

    try {
      const notes = editingNotes[reportId];
      const { error } = await supabase
        .from("question_reports")
        .update({
          status: newStatus,
          tutor_notes: notes || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) throw error;

      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, status: newStatus, tutor_notes: notes || null }
            : r
        )
      );

      toast.success(`Report marked as ${newStatus}`);
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Failed to update report");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredReports = filterStatus === "all" 
    ? reports 
    : reports.filter((r) => r.status === filterStatus);

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-accent" />
            Question Reports
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
            <h3 className="font-display font-semibold text-foreground mb-2">
              No Reports Yet
            </h3>
            <p className="text-muted-foreground text-sm">
              Your questions haven't received any reports. Great job!
            </p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No reports match the selected filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => {
              const isExpanded = expandedId === report.id;
              const statusConfig = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={report.id}
                  className="border border-border rounded-xl overflow-hidden"
                >
                  {/* Report Header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                    className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        <Badge variant="outline">
                          {REASON_LABELS[report.reason] || report.reason}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(report.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="text-foreground text-sm line-clamp-2">
                        {report.question?.question_text || "Question not found"}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-border p-4 space-y-4 bg-muted/30">
                      {/* Full Question */}
                      {report.question && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-foreground">
                            {report.question.question_text}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {["A", "B", "C", "D"].map((opt) => {
                              const key = `option_${opt.toLowerCase()}` as keyof typeof report.question;
                              const isCorrect = report.question?.correct_option === opt;
                              return (
                                <div
                                  key={opt}
                                  className={`p-2 rounded-lg border ${
                                    isCorrect
                                      ? "border-success bg-success/10"
                                      : "border-border"
                                  }`}
                                >
                                  <span className="font-medium">{opt}.</span>{" "}
                                  {report.question?.[key]}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Reporter's Description */}
                      {report.description && (
                        <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">
                              Reporter's note:{" "}
                            </span>
                            {report.description}
                          </p>
                        </div>
                      )}

                      {/* Tutor Notes */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Your Notes (visible only to you)
                        </label>
                        <Textarea
                          placeholder="Add notes about this report..."
                          value={editingNotes[report.id] ?? report.tutor_notes ?? ""}
                          onChange={(e) =>
                            setEditingNotes((prev) => ({
                              ...prev,
                              [report.id]: e.target.value,
                            }))
                          }
                          className="min-h-[80px] resize-none"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(report.id, "reviewed")}
                          disabled={updatingId === report.id}
                        >
                          {updatingId === report.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Mark Reviewed
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleUpdateStatus(report.id, "resolved")}
                          disabled={updatingId === report.id}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Mark Resolved
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateStatus(report.id, "dismissed")}
                          disabled={updatingId === report.id}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuestionReports;
