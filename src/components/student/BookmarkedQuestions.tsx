import { useState, useEffect } from "react";
import { useBookmarkedQuestions } from "@/hooks/useBookmarkedQuestions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Bookmark,
  BookmarkX,
  ChevronDown,
  ChevronUp,
  Loader2,
  BookOpen,
  MessageSquare,
  Save,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuestionDetails {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  course: { code: string; name: string } | null;
  topic: { name: string } | null;
}

const BookmarkedQuestions = () => {
  const { bookmarks, isLoading, toggleBookmark, updateBookmarkNotes } = useBookmarkedQuestions();
  const [questions, setQuestions] = useState<Record<string, QuestionDetails>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [showAnswer, setShowAnswer] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchQuestionDetails = async () => {
      if (bookmarks.length === 0) {
        setLoadingQuestions(false);
        return;
      }

      try {
        const questionIds = bookmarks.map((b) => b.question_id);
        const { data, error } = await supabase
          .from("questions")
          .select("*, courses(code, name), topics(name)")
          .in("id", questionIds);

        if (error) throw error;

        const questionsMap: Record<string, QuestionDetails> = {};
        data?.forEach((q: any) => {
          questionsMap[q.id] = {
            ...q,
            course: q.courses,
            topic: q.topics,
          };
        });
        setQuestions(questionsMap);
      } catch (error) {
        console.error("Error fetching question details:", error);
      } finally {
        setLoadingQuestions(false);
      }
    };

    if (!isLoading) {
      fetchQuestionDetails();
    }
  }, [bookmarks, isLoading]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleShowAnswer = (id: string) => {
    setShowAnswer((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleNotesChange = (questionId: string, notes: string) => {
    setEditingNotes((prev) => ({ ...prev, [questionId]: notes }));
  };

  const handleSaveNotes = async (questionId: string) => {
    const notes = editingNotes[questionId];
    if (notes !== undefined) {
      await updateBookmarkNotes(questionId, notes);
    }
  };

  if (isLoading || loadingQuestions) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground mb-2">
            No Bookmarked Questions
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            While practicing quizzes, bookmark difficult questions to review them later.
            Click the bookmark icon on any question to save it here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const options = ["A", "B", "C", "D"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-primary" />
          Bookmarked Questions ({bookmarks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bookmarks.map((bookmark) => {
          const question = questions[bookmark.question_id];
          if (!question) return null;

          const isExpanded = expandedId === bookmark.question_id;
          const currentNotes = editingNotes[bookmark.question_id] ?? bookmark.notes ?? "";

          return (
            <div
              key={bookmark.id}
              className="border border-border rounded-xl overflow-hidden"
            >
              {/* Question Header */}
              <button
                onClick={() => toggleExpand(bookmark.question_id)}
                className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {question.course && (
                      <Badge variant="secondary" className="text-xs">
                        {question.course.code}
                      </Badge>
                    )}
                    {question.topic && (
                      <Badge variant="outline" className="text-xs">
                        {question.topic.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-foreground font-medium line-clamp-2">
                    {question.question_text}
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
                  {/* Options */}
                  <div className="space-y-2">
                    {options.map((opt) => {
                      const optionKey = `option_${opt.toLowerCase()}` as keyof QuestionDetails;
                      const isCorrect = question.correct_option === opt;
                      const shouldReveal = showAnswer.has(bookmark.question_id);

                      return (
                        <div
                          key={opt}
                          className={`p-3 rounded-lg border ${
                            shouldReveal && isCorrect
                              ? "border-success bg-success/10"
                              : "border-border"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`w-7 h-7 rounded-md flex items-center justify-center text-sm font-semibold ${
                                shouldReveal && isCorrect
                                  ? "bg-success text-success-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {opt}
                            </span>
                            <span className="text-foreground text-sm flex-1">
                              {question[optionKey] as string}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Show Answer Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleShowAnswer(bookmark.question_id)}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    {showAnswer.has(bookmark.question_id) ? "Hide Answer" : "Show Answer"}
                  </Button>

                  {/* Explanation */}
                  {showAnswer.has(bookmark.question_id) && question.explanation && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Explanation: </span>
                        {question.explanation}
                      </p>
                    </div>
                  )}

                  {/* Notes Section */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <MessageSquare className="w-4 h-4" />
                      Your Notes
                    </label>
                    <Textarea
                      placeholder="Add notes about this question..."
                      value={currentNotes}
                      onChange={(e) => handleNotesChange(bookmark.question_id, e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                    {editingNotes[bookmark.question_id] !== undefined &&
                      editingNotes[bookmark.question_id] !== (bookmark.notes ?? "") && (
                        <Button
                          size="sm"
                          onClick={() => handleSaveNotes(bookmark.question_id)}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Notes
                        </Button>
                      )}
                  </div>

                  {/* Remove Bookmark */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => toggleBookmark(bookmark.question_id)}
                  >
                    <BookmarkX className="w-4 h-4 mr-2" />
                    Remove Bookmark
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default BookmarkedQuestions;
