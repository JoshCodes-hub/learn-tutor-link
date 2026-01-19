import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  Eye
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface ImportedQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

interface BulkQuestionImportProps {
  onImport: (questions: ImportedQuestion[]) => void;
  onClose: () => void;
}

type ViewMode = "upload" | "preview" | "edit";

export function BulkQuestionImport({ onImport, onClose }: BulkQuestionImportProps) {
  const [importedQuestions, setImportedQuestions] = useState<ImportedQuestion[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("upload");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeCorrectOption = (value: string): "A" | "B" | "C" | "D" | null => {
    const normalized = String(value).trim().toUpperCase();
    if (["A", "B", "C", "D"].includes(normalized)) {
      return normalized as "A" | "B" | "C" | "D";
    }
    return null;
  };

  const normalizeDifficulty = (value: string): "easy" | "medium" | "hard" => {
    const normalized = String(value).trim().toLowerCase();
    if (["easy", "medium", "hard"].includes(normalized)) {
      return normalized as "easy" | "medium" | "hard";
    }
    return "medium";
  };

  const isQuestionValid = (q: ImportedQuestion): boolean => {
    return !!(
      q.question_text.trim() &&
      q.option_a.trim() &&
      q.option_b.trim() &&
      q.option_c.trim() &&
      q.option_d.trim() &&
      q.correct_option
    );
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setErrors([]);
    setImportedQuestions([]);

    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      
      if (!["csv", "xlsx", "xls"].includes(fileExtension || "")) {
        throw new Error("Please upload a CSV or Excel file (.csv, .xlsx, .xls)");
      }

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (jsonData.length === 0) {
        throw new Error("The file appears to be empty");
      }

      const questions: ImportedQuestion[] = [];
      const parseErrors: string[] = [];

      jsonData.forEach((row: any, index: number) => {
        const rowNum = index + 2;

        const questionText = row.question_text || row.question || row.Question || row["Question Text"] || "";
        const optionA = row.option_a || row.Option_A || row["Option A"] || row.A || "";
        const optionB = row.option_b || row.Option_B || row["Option B"] || row.B || "";
        const optionC = row.option_c || row.Option_C || row["Option C"] || row.C || "";
        const optionD = row.option_d || row.Option_D || row["Option D"] || row.D || "";
        const correctOption = row.correct_option || row.correct || row.Correct || row["Correct Option"] || row.Answer || "";
        const explanation = row.explanation || row.Explanation || "";
        const difficulty = row.difficulty || row.Difficulty || "medium";

        if (!String(questionText).trim()) {
          parseErrors.push(`Row ${rowNum}: Missing question text`);
          return;
        }
        if (!String(optionA).trim() || !String(optionB).trim() || !String(optionC).trim() || !String(optionD).trim()) {
          parseErrors.push(`Row ${rowNum}: Missing one or more options`);
          return;
        }

        const normalizedCorrect = normalizeCorrectOption(correctOption);
        if (!normalizedCorrect) {
          parseErrors.push(`Row ${rowNum}: Invalid correct option "${correctOption}" (must be A, B, C, or D)`);
          return;
        }

        questions.push({
          question_text: String(questionText).trim(),
          option_a: String(optionA).trim(),
          option_b: String(optionB).trim(),
          option_c: String(optionC).trim(),
          option_d: String(optionD).trim(),
          correct_option: normalizedCorrect,
          explanation: String(explanation).trim(),
          difficulty: normalizeDifficulty(difficulty),
        });
      });

      setImportedQuestions(questions);
      setErrors(parseErrors);

      if (questions.length > 0) {
        toast.success(`Successfully parsed ${questions.length} questions`);
        setViewMode("preview");
        setPreviewIndex(0);
      } else if (parseErrors.length > 0) {
        toast.error("No valid questions found. Check the errors below.");
      }
    } catch (error: any) {
      console.error("File processing error:", error);
      setErrors([error.message || "Failed to process file"]);
      toast.error(error.message || "Failed to process file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        question_text: "What is the capital of France?",
        option_a: "London",
        option_b: "Paris",
        option_c: "Berlin",
        option_d: "Madrid",
        correct_option: "B",
        explanation: "Paris is the capital and largest city of France.",
        difficulty: "easy",
      },
      {
        question_text: "Which planet is known as the Red Planet?",
        option_a: "Venus",
        option_b: "Jupiter",
        option_c: "Mars",
        option_d: "Saturn",
        correct_option: "C",
        explanation: "Mars appears red due to iron oxide on its surface.",
        difficulty: "easy",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
    XLSX.writeFile(workbook, "question_import_template.xlsx");
    toast.success("Template downloaded!");
  };

  const updateQuestion = (index: number, field: keyof ImportedQuestion, value: string) => {
    const updated = [...importedQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setImportedQuestions(updated);
  };

  const deleteQuestion = (index: number) => {
    const updated = importedQuestions.filter((_, i) => i !== index);
    setImportedQuestions(updated);
    if (previewIndex >= updated.length && updated.length > 0) {
      setPreviewIndex(updated.length - 1);
    }
    if (updated.length === 0) {
      setViewMode("upload");
    }
    toast.success("Question removed");
  };

  const handleImport = () => {
    const validQuestions = importedQuestions.filter(isQuestionValid);
    if (validQuestions.length > 0) {
      onImport(validQuestions);
      toast.success(`${validQuestions.length} questions added!`);
    } else {
      toast.error("No valid questions to import");
    }
  };

  const validCount = importedQuestions.filter(isQuestionValid).length;
  const invalidCount = importedQuestions.length - validCount;
  const currentQuestion = importedQuestions[previewIndex];

  // Upload View
  if (viewMode === "upload") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Bulk Import Questions</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm">
              <p className="font-medium">Need a template?</p>
              <p className="text-muted-foreground">Download our Excel template with sample questions</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Template
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Upload File (CSV or Excel)</Label>
          <div 
            className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground">CSV, XLSX, or XLS files</p>
          </div>
        </div>

        {isProcessing && (
          <div className="p-4 rounded-lg bg-muted/30 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm">Processing file...</p>
          </div>
        )}

        {errors.length > 0 && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="font-medium text-sm text-destructive">
                {errors.length} {errors.length === 1 ? "error" : "errors"} found
              </span>
            </div>
            <ScrollArea className="max-h-24">
              <ul className="text-xs text-destructive space-y-1">
                {errors.slice(0, 10).map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
                {errors.length > 10 && (
                  <li className="text-muted-foreground">...and {errors.length - 10} more</li>
                )}
              </ul>
            </ScrollArea>
          </div>
        )}

        <div className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/30">
          <p className="font-medium mb-1">Required columns:</p>
          <p>question_text, option_a, option_b, option_c, option_d, correct_option (A/B/C/D)</p>
          <p className="mt-1 font-medium">Optional columns:</p>
          <p>explanation, difficulty (easy/medium/hard)</p>
        </div>
      </div>
    );
  }

  // Preview View
  if (viewMode === "preview" && currentQuestion) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Review Questions</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium">{validCount} valid</span>
          </div>
          {invalidCount > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">{invalidCount} need attention</span>
            </div>
          )}
        </div>

        {/* Question Navigation Pills */}
        <div className="flex flex-wrap gap-1.5">
          {importedQuestions.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPreviewIndex(i)}
              className={cn(
                "w-7 h-7 rounded-full text-xs font-medium transition-all",
                previewIndex === i
                  ? "bg-primary text-primary-foreground"
                  : isQuestionValid(q)
                  ? "bg-primary/20 text-primary"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question Preview Card */}
        <div className="p-4 rounded-lg border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Q{previewIndex + 1}</Badge>
              <Badge variant="secondary" className="capitalize">{currentQuestion.difficulty}</Badge>
              {!isQuestionValid(currentQuestion) && (
                <Badge variant="destructive" className="text-xs">Incomplete</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setEditingIndex(previewIndex);
                  setViewMode("edit");
                }}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => deleteQuestion(previewIndex)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <p className="font-medium text-sm">{currentQuestion.question_text || "(No question text)"}</p>

          <div className="grid grid-cols-2 gap-2">
            {(["A", "B", "C", "D"] as const).map((opt) => {
              const optionKey = `option_${opt.toLowerCase()}` as keyof ImportedQuestion;
              const isCorrect = currentQuestion.correct_option === opt;
              return (
                <div
                  key={opt}
                  className={cn(
                    "p-2 rounded text-sm border",
                    isCorrect
                      ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                      : "bg-muted/30"
                  )}
                >
                  <span className="font-medium">{opt}.</span>{" "}
                  {currentQuestion[optionKey] || "(empty)"}
                  {isCorrect && (
                    <CheckCircle2 className="w-3 h-3 inline ml-1 text-green-600" />
                  )}
                </div>
              );
            })}
          </div>

          {currentQuestion.explanation && (
            <div className="p-2 rounded bg-muted/30 text-xs">
              <span className="font-medium">Explanation:</span> {currentQuestion.explanation}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
            disabled={previewIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {previewIndex + 1} of {importedQuestions.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewIndex(Math.min(importedQuestions.length - 1, previewIndex + 1))}
            disabled={previewIndex === importedQuestions.length - 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setViewMode("upload");
              setImportedQuestions([]);
            }}
          >
            Upload Different File
          </Button>
          <Button
            className="flex-1"
            onClick={handleImport}
            disabled={validCount === 0}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Import {validCount} Questions
          </Button>
        </div>
      </div>
    );
  }

  // Edit View
  if (viewMode === "edit" && editingIndex !== null && importedQuestions[editingIndex]) {
    const editQuestion = importedQuestions[editingIndex];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Edit Question {editingIndex + 1}</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4 pr-2">
            <div className="space-y-2">
              <Label>Question Text *</Label>
              <Textarea
                value={editQuestion.question_text}
                onChange={(e) => updateQuestion(editingIndex, "question_text", e.target.value)}
                rows={3}
                placeholder="Enter question text..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(["A", "B", "C", "D"] as const).map((opt) => {
                const optionKey = `option_${opt.toLowerCase()}` as keyof ImportedQuestion;
                return (
                  <div key={opt} className="space-y-1">
                    <Label className="text-xs">Option {opt} *</Label>
                    <Input
                      value={editQuestion[optionKey] as string}
                      onChange={(e) => updateQuestion(editingIndex, optionKey, e.target.value)}
                      placeholder={`Option ${opt}`}
                    />
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label>Correct Answer</Label>
              <RadioGroup
                value={editQuestion.correct_option}
                onValueChange={(v) => updateQuestion(editingIndex, "correct_option", v)}
                className="flex gap-4"
              >
                {["A", "B", "C", "D"].map((opt) => (
                  <div key={opt} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt} id={`edit-correct-${opt}`} />
                    <Label htmlFor={`edit-correct-${opt}`}>{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Explanation (optional)</Label>
              <Textarea
                value={editQuestion.explanation}
                onChange={(e) => updateQuestion(editingIndex, "explanation", e.target.value)}
                rows={2}
                placeholder="Explain why this is the correct answer..."
              />
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={editQuestion.difficulty}
                onValueChange={(v) => updateQuestion(editingIndex, "difficulty", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setViewMode("preview");
              setEditingIndex(null);
            }}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Preview
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              setViewMode("preview");
              setEditingIndex(null);
              toast.success("Question updated");
            }}
            disabled={!isQuestionValid(editQuestion)}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
