import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  Users,
  Coins,
  FileText,
  ChevronRight,
  Plus,
  BookOpen,
  Copy,
  CheckCircle,
} from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  token_cost: number;
  is_premium: boolean;
  question_count: number;
  duration_minutes: number;
  is_active: boolean;
  is_simulation: boolean;
  created_at: string;
  course: {
    code: string;
    name: string;
  };
  attempts_count: number;
}

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  difficulty: string;
}

const QuizManagement = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  // Edit quiz state
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    duration_minutes: "30",
    is_premium: false,
    token_cost: "10",
    is_active: true,
    is_simulation: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete quiz state
  const [deletingQuiz, setDeletingQuiz] = useState<Quiz | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View questions state
  const [viewingQuiz, setViewingQuiz] = useState<Quiz | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Duplicate quiz state
  const [duplicatingQuiz, setDuplicatingQuiz] = useState<Quiz | null>(null);
  const [duplicateTitle, setDuplicateTitle] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchQuizzes();
    }
  }, [user]);

  const fetchQuizzes = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*, courses(code, name)")
        .eq("tutor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const quizzesWithCounts = await Promise.all(
          data.map(async (quiz) => {
            const { count } = await supabase
              .from("quiz_attempts")
              .select("*", { count: "exact", head: true })
              .eq("quiz_id", quiz.id);

            return {
              ...quiz,
              course: quiz.courses as { code: string; name: string },
              attempts_count: count || 0,
            };
          })
        );
        setQuizzes(quizzesWithCounts);
      }
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      toast.error("Failed to load quizzes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setEditForm({
      title: quiz.title,
      description: quiz.description || "",
      duration_minutes: quiz.duration_minutes.toString(),
      is_premium: quiz.is_premium,
      token_cost: quiz.token_cost.toString(),
      is_active: quiz.is_active,
      is_simulation: quiz.is_simulation,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingQuiz) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("quizzes")
        .update({
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          duration_minutes: parseInt(editForm.duration_minutes),
          is_premium: editForm.is_premium,
          token_cost: editForm.is_premium ? parseInt(editForm.token_cost) : 0,
          is_active: editForm.is_active,
          is_simulation: editForm.is_simulation,
        })
        .eq("id", editingQuiz.id);

      if (error) throw error;

      toast.success("Quiz updated successfully");
      setEditingQuiz(null);
      fetchQuizzes();
    } catch (error: any) {
      console.error("Error updating quiz:", error);
      toast.error(error.message || "Failed to update quiz");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!deletingQuiz) return;
    setIsDeleting(true);

    try {
      // Delete related records first
      await supabase.from("quiz_questions").delete().eq("quiz_id", deletingQuiz.id);
      await supabase.from("quiz_ratings").delete().eq("quiz_id", deletingQuiz.id);
      await supabase.from("student_quiz_purchases").delete().eq("quiz_id", deletingQuiz.id);

      const { error } = await supabase.from("quizzes").delete().eq("id", deletingQuiz.id);

      if (error) throw error;

      toast.success("Quiz deleted successfully");
      setDeletingQuiz(null);
      fetchQuizzes();
    } catch (error: any) {
      console.error("Error deleting quiz:", error);
      toast.error(error.message || "Failed to delete quiz");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (quiz: Quiz) => {
    try {
      const { error } = await supabase
        .from("quizzes")
        .update({ is_active: !quiz.is_active })
        .eq("id", quiz.id);

      if (error) throw error;

      toast.success(quiz.is_active ? "Quiz deactivated" : "Quiz activated");
      fetchQuizzes();
    } catch (error: any) {
      console.error("Error toggling quiz:", error);
      toast.error("Failed to update quiz status");
    }
  };

  const handleViewQuestions = async (quiz: Quiz) => {
    setViewingQuiz(quiz);
    setLoadingQuestions(true);

    try {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("question_id, order_index, questions(*)")
        .eq("quiz_id", quiz.id)
        .order("order_index");

      if (error) throw error;

      if (data) {
        const questions = data.map((qq: any) => qq.questions as Question);
        setQuizQuestions(questions);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load questions");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleDuplicateQuiz = async () => {
    if (!duplicatingQuiz || !user) return;
    setIsDuplicating(true);

    try {
      // Create new quiz
      const { data: newQuiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title: duplicateTitle.trim() || `${duplicatingQuiz.title} (Copy)`,
          description: duplicatingQuiz.description,
          course_id: (duplicatingQuiz as any).course_id,
          tutor_id: user.id,
          token_cost: duplicatingQuiz.token_cost,
          is_premium: duplicatingQuiz.is_premium,
          question_count: duplicatingQuiz.question_count,
          duration_minutes: duplicatingQuiz.duration_minutes,
          is_active: false, // Start as inactive
          is_simulation: duplicatingQuiz.is_simulation,
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Copy quiz questions
      const { data: originalQuestions } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", duplicatingQuiz.id);

      if (originalQuestions && originalQuestions.length > 0) {
        const newQuizQuestions = originalQuestions.map((qq) => ({
          quiz_id: newQuiz.id,
          question_id: qq.question_id,
          order_index: qq.order_index,
        }));

        await supabase.from("quiz_questions").insert(newQuizQuestions);
      }

      toast.success("Quiz duplicated successfully");
      setDuplicatingQuiz(null);
      setDuplicateTitle("");
      fetchQuizzes();
    } catch (error: any) {
      console.error("Error duplicating quiz:", error);
      toast.error(error.message || "Failed to duplicate quiz");
    } finally {
      setIsDuplicating(false);
    }
  };

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch =
      quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quiz.course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quiz.course.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "active" && quiz.is_active) ||
      (filterStatus === "inactive" && !quiz.is_active);

    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Quiz Management
          </CardTitle>
          <CardDescription>
            View, edit, and manage all your quizzes in one place
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search quizzes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All ({quizzes.length})</TabsTrigger>
                <TabsTrigger value="active">
                  Active ({quizzes.filter((q) => q.is_active).length})
                </TabsTrigger>
                <TabsTrigger value="inactive">
                  Inactive ({quizzes.filter((q) => !q.is_active).length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Quiz List */}
          {filteredQuizzes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No quizzes found</p>
              <p className="text-sm">
                {searchQuery ? "Try a different search term" : "Create your first quiz to get started"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{quiz.title}</h4>
                      {quiz.is_simulation && (
                        <Badge variant="secondary" className="shrink-0">
                          <Clock className="w-3 h-3 mr-1" />
                          Simulation
                        </Badge>
                      )}
                      {quiz.is_premium && (
                        <Badge className="shrink-0 bg-accent text-accent-foreground">
                          <Coins className="w-3 h-3 mr-1" />
                          {quiz.token_cost}
                        </Badge>
                      )}
                      <Badge variant={quiz.is_active ? "default" : "outline"} className="shrink-0">
                        {quiz.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        {quiz.course.code}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {quiz.question_count} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {quiz.duration_minutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {quiz.attempts_count} attempts
                      </span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewQuestions(quiz)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Questions
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditQuiz(quiz)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit Quiz
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setDuplicatingQuiz(quiz);
                          setDuplicateTitle(`${quiz.title} (Copy)`);
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(quiz)}>
                        {quiz.is_active ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeletingQuiz(quiz)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Quiz Dialog */}
      <Dialog open={!!editingQuiz} onOpenChange={() => setEditingQuiz(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Quiz</DialogTitle>
            <DialogDescription>Update quiz settings and pricing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min="5"
                max="180"
                value={editForm.duration_minutes}
                onChange={(e) => setEditForm({ ...editForm, duration_minutes: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <Label>CBT Simulation</Label>
                <p className="text-xs text-muted-foreground">Timed exam mode</p>
              </div>
              <Switch
                checked={editForm.is_simulation}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_simulation: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <Label>Premium Quiz</Label>
                <p className="text-xs text-muted-foreground">Charge tokens</p>
              </div>
              <Switch
                checked={editForm.is_premium}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_premium: checked })}
              />
            </div>
            {editForm.is_premium && (
              <div className="space-y-2">
                <Label>Token Cost</Label>
                <Input
                  type="number"
                  min="1"
                  value={editForm.token_cost}
                  onChange={(e) => setEditForm({ ...editForm, token_cost: e.target.value })}
                />
              </div>
            )}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Visible to students</p>
              </div>
              <Switch
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuiz(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingQuiz} onOpenChange={() => setDeletingQuiz(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Delete Quiz
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingQuiz?.title}"?
              {deletingQuiz && deletingQuiz.attempts_count > 0 && (
                <span className="block mt-2 text-destructive">
                  Warning: This quiz has {deletingQuiz.attempts_count} attempts.
                </span>
              )}
              <span className="block mt-2">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeletingQuiz(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteQuiz} disabled={isDeleting}>
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Questions Dialog */}
      <Dialog open={!!viewingQuiz} onOpenChange={() => setViewingQuiz(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Questions: {viewingQuiz?.title}</DialogTitle>
            <DialogDescription>
              {viewingQuiz?.question_count} questions in this quiz
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[50vh] space-y-4">
            {loadingQuestions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : quizQuestions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No questions found</p>
            ) : (
              quizQuestions.map((question, index) => (
                <div key={question.id} className="p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary text-xs font-medium rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                      <p className="font-medium">{question.question_text}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {["A", "B", "C", "D"].map((opt) => (
                          <div
                            key={opt}
                            className={`p-2 rounded ${
                              question.correct_option === opt
                                ? "bg-success/10 text-success border border-success/30"
                                : "bg-background"
                            }`}
                          >
                            <span className="font-medium">{opt}:</span>{" "}
                            {question[`option_${opt.toLowerCase()}` as keyof Question]}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{question.difficulty}</Badge>
                        {question.explanation && (
                          <span className="text-xs text-muted-foreground">Has explanation</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingQuiz(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Quiz Dialog */}
      <Dialog open={!!duplicatingQuiz} onOpenChange={() => setDuplicatingQuiz(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Quiz</DialogTitle>
            <DialogDescription>Create a copy of this quiz with all its questions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Quiz Title</Label>
              <Input
                value={duplicateTitle}
                onChange={(e) => setDuplicateTitle(e.target.value)}
                placeholder="Enter title for the duplicate"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicatingQuiz(null)}>
              Cancel
            </Button>
            <Button onClick={handleDuplicateQuiz} disabled={isDuplicating}>
              {isDuplicating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuizManagement;
