import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  Plus,
  BookOpen,
  Copy,
  CheckCircle,
  GripVertical,
  Settings,
  X,
  Check,
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
  course_id: string;
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

interface QuizQuestion {
  id: string;
  question_id: string;
  order_index: number;
  question: Question;
}

// Sortable Question Item Component
const SortableQuestionItem = ({
  item,
  index,
  onRemove,
}: {
  item: QuizQuestion;
  index: number;
  onRemove: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border"
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary text-xs font-medium rounded-full flex items-center justify-center">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm line-clamp-2">{item.question.question_text}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {item.question.difficulty}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Answer: {item.question.correct_option}
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-destructive hover:text-destructive"
        onClick={() => onRemove(item.id)}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

const QuizManagement = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  // Bulk selection state
  const [selectedQuizzes, setSelectedQuizzes] = useState<Set<string>>(new Set());
  const [isBulkActioning, setIsBulkActioning] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

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

  // Manage questions state
  const [managingQuiz, setManagingQuiz] = useState<Quiz | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [questionSearchQuery, setQuestionSearchQuery] = useState("");

  // Duplicate quiz state
  const [duplicatingQuiz, setDuplicatingQuiz] = useState<Quiz | null>(null);
  const [duplicateTitle, setDuplicateTitle] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Bulk action handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuizzes(new Set(filteredQuizzes.map((q) => q.id)));
    } else {
      setSelectedQuizzes(new Set());
    }
  };

  const handleSelectQuiz = (quizId: string, checked: boolean) => {
    const newSelected = new Set(selectedQuizzes);
    if (checked) {
      newSelected.add(quizId);
    } else {
      newSelected.delete(quizId);
    }
    setSelectedQuizzes(newSelected);
  };

  const handleBulkActivate = async () => {
    if (selectedQuizzes.size === 0) return;
    setIsBulkActioning(true);

    try {
      const { error } = await supabase
        .from("quizzes")
        .update({ is_active: true })
        .in("id", Array.from(selectedQuizzes));

      if (error) throw error;

      toast.success(`${selectedQuizzes.size} quizzes activated`);
      setSelectedQuizzes(new Set());
      fetchQuizzes();
    } catch (error) {
      console.error("Error activating quizzes:", error);
      toast.error("Failed to activate quizzes");
    } finally {
      setIsBulkActioning(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedQuizzes.size === 0) return;
    setIsBulkActioning(true);

    try {
      const { error } = await supabase
        .from("quizzes")
        .update({ is_active: false })
        .in("id", Array.from(selectedQuizzes));

      if (error) throw error;

      toast.success(`${selectedQuizzes.size} quizzes deactivated`);
      setSelectedQuizzes(new Set());
      fetchQuizzes();
    } catch (error) {
      console.error("Error deactivating quizzes:", error);
      toast.error("Failed to deactivate quizzes");
    } finally {
      setIsBulkActioning(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuizzes.size === 0) return;
    setIsBulkActioning(true);

    try {
      const quizIds = Array.from(selectedQuizzes);

      // Delete related records
      await supabase.from("quiz_questions").delete().in("quiz_id", quizIds);
      await supabase.from("quiz_ratings").delete().in("quiz_id", quizIds);
      await supabase.from("student_quiz_purchases").delete().in("quiz_id", quizIds);

      const { error } = await supabase.from("quizzes").delete().in("id", quizIds);

      if (error) throw error;

      toast.success(`${selectedQuizzes.size} quizzes deleted`);
      setSelectedQuizzes(new Set());
      setShowBulkDeleteConfirm(false);
      fetchQuizzes();
    } catch (error) {
      console.error("Error deleting quizzes:", error);
      toast.error("Failed to delete quizzes");
    } finally {
      setIsBulkActioning(false);
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

  // Manage questions handlers
  const handleManageQuestions = async (quiz: Quiz) => {
    setManagingQuiz(quiz);
    setLoadingQuestions(true);

    try {
      // Fetch current quiz questions
      const { data: currentQuestions, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("id, question_id, order_index, questions(*)")
        .eq("quiz_id", quiz.id)
        .order("order_index");

      if (questionsError) throw questionsError;

      const formattedQuestions: QuizQuestion[] = (currentQuestions || []).map((qq: any) => ({
        id: qq.id,
        question_id: qq.question_id,
        order_index: qq.order_index,
        question: qq.questions as Question,
      }));
      setQuizQuestions(formattedQuestions);

      // Fetch available questions from the same course
      const { data: courseQuestions, error: courseError } = await supabase
        .from("questions")
        .select("*")
        .eq("course_id", quiz.course_id)
        .eq("is_approved", true);

      if (courseError) throw courseError;

      setAvailableQuestions(courseQuestions || []);
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load questions");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setQuizQuestions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRemoveQuestion = (quizQuestionId: string) => {
    setQuizQuestions((prev) => prev.filter((q) => q.id !== quizQuestionId));
  };

  const handleAddQuestion = (question: Question) => {
    // Check if already added
    if (quizQuestions.some((qq) => qq.question_id === question.id)) {
      toast.error("Question already in quiz");
      return;
    }

    const newQuizQuestion: QuizQuestion = {
      id: `new-${Date.now()}-${question.id}`,
      question_id: question.id,
      order_index: quizQuestions.length,
      question,
    };

    setQuizQuestions((prev) => [...prev, newQuizQuestion]);
  };

  const handleSaveQuestions = async () => {
    if (!managingQuiz) return;
    setSavingQuestions(true);

    try {
      // Delete existing quiz questions
      await supabase.from("quiz_questions").delete().eq("quiz_id", managingQuiz.id);

      // Insert new quiz questions with updated order
      if (quizQuestions.length > 0) {
        const newQuizQuestions = quizQuestions.map((qq, index) => ({
          quiz_id: managingQuiz.id,
          question_id: qq.question_id,
          order_index: index,
        }));

        const { error } = await supabase.from("quiz_questions").insert(newQuizQuestions);
        if (error) throw error;
      }

      // Update question count
      await supabase
        .from("quizzes")
        .update({ question_count: quizQuestions.length })
        .eq("id", managingQuiz.id);

      toast.success("Questions saved successfully");
      setManagingQuiz(null);
      fetchQuizzes();
    } catch (error: any) {
      console.error("Error saving questions:", error);
      toast.error(error.message || "Failed to save questions");
    } finally {
      setSavingQuestions(false);
    }
  };

  const handleDuplicateQuiz = async () => {
    if (!duplicatingQuiz || !user) return;
    setIsDuplicating(true);

    try {
      const { data: newQuiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title: duplicateTitle.trim() || `${duplicatingQuiz.title} (Copy)`,
          description: duplicatingQuiz.description,
          course_id: duplicatingQuiz.course_id,
          tutor_id: user.id,
          token_cost: duplicatingQuiz.token_cost,
          is_premium: duplicatingQuiz.is_premium,
          question_count: duplicatingQuiz.question_count,
          duration_minutes: duplicatingQuiz.duration_minutes,
          is_active: false,
          is_simulation: duplicatingQuiz.is_simulation,
        })
        .select()
        .single();

      if (quizError) throw quizError;

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

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
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
  }, [quizzes, searchQuery, filterStatus]);

  const filteredAvailableQuestions = useMemo(() => {
    const currentQuestionIds = new Set(quizQuestions.map((qq) => qq.question_id));
    return availableQuestions.filter(
      (q) =>
        !currentQuestionIds.has(q.id) &&
        q.question_text.toLowerCase().includes(questionSearchQuery.toLowerCase())
    );
  }, [availableQuestions, quizQuestions, questionSearchQuery]);

  const isAllSelected =
    filteredQuizzes.length > 0 && filteredQuizzes.every((q) => selectedQuizzes.has(q.id));

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

          {/* Bulk Actions Bar */}
          {selectedQuizzes.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <span className="text-sm font-medium">
                {selectedQuizzes.size} selected
              </span>
              <div className="flex gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkActivate}
                  disabled={isBulkActioning}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkDeactivate}
                  disabled={isBulkActioning}
                >
                  <EyeOff className="w-4 h-4 mr-1" />
                  Deactivate
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  disabled={isBulkActioning}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedQuizzes(new Set())}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

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
            <div className="space-y-2">
              {/* Select All Header */}
              <div className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                />
                <span>Select all</span>
              </div>

              {filteredQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                    selectedQuizzes.has(quiz.id)
                      ? "bg-primary/5 border-primary/30"
                      : "bg-muted/30 border-border hover:border-primary/30"
                  }`}
                >
                  <Checkbox
                    checked={selectedQuizzes.has(quiz.id)}
                    onCheckedChange={(checked) => handleSelectQuiz(quiz.id, checked as boolean)}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
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
                      <DropdownMenuItem onClick={() => handleManageQuestions(quiz)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Questions
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

      {/* Manage Questions Dialog */}
      <Dialog open={!!managingQuiz} onOpenChange={() => setManagingQuiz(null)}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Manage Questions: {managingQuiz?.title}
            </DialogTitle>
            <DialogDescription>
              Drag to reorder, add new questions, or remove existing ones
            </DialogDescription>
          </DialogHeader>

          {loadingQuestions ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current Questions - Sortable */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Current Questions ({quizQuestions.length})</h4>
                </div>
                <ScrollArea className="h-[400px] pr-4">
                  {quizQuestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No questions in this quiz</p>
                      <p className="text-sm">Add questions from the right panel</p>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={quizQuestions.map((q) => q.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {quizQuestions.map((item, index) => (
                            <SortableQuestionItem
                              key={item.id}
                              item={item}
                              index={index}
                              onRemove={handleRemoveQuestion}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </ScrollArea>
              </div>

              {/* Available Questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Available Questions</h4>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions..."
                    value={questionSearchQuery}
                    onChange={(e) => setQuestionSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-[360px] pr-4">
                  {filteredAvailableQuestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No available questions</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredAvailableQuestions.map((question) => (
                        <div
                          key={question.id}
                          className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border hover:border-primary/30 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-clamp-2">{question.question_text}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {question.difficulty}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-success hover:text-success"
                            onClick={() => handleAddQuestion(question)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setManagingQuiz(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuestions} disabled={savingQuestions}>
              {savingQuestions && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Check className="w-4 h-4 mr-2" />
              Save Questions
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

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Delete {selectedQuizzes.size} Quizzes
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedQuizzes.size} quizzes? This action cannot be
              undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkActioning}>
              {isBulkActioning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete All
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
