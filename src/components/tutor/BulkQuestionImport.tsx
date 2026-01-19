import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export function BulkQuestionImport({ onImport, onClose }: BulkQuestionImportProps) {
  const [importedQuestions, setImportedQuestions] = useState<ImportedQuestion[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
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
        const rowNum = index + 2; // +2 because row 1 is header, and index starts at 0

        // Try to match common column name variations
        const questionText = row.question_text || row.question || row.Question || row["Question Text"] || "";
        const optionA = row.option_a || row.Option_A || row["Option A"] || row.A || "";
        const optionB = row.option_b || row.Option_B || row["Option B"] || row.B || "";
        const optionC = row.option_c || row.Option_C || row["Option C"] || row.C || "";
        const optionD = row.option_d || row.Option_D || row["Option D"] || row.D || "";
        const correctOption = row.correct_option || row.correct || row.Correct || row["Correct Option"] || row.Answer || "";
        const explanation = row.explanation || row.Explanation || "";
        const difficulty = row.difficulty || row.Difficulty || "medium";

        // Validate required fields
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

  const handleImport = () => {
    if (importedQuestions.length > 0) {
      onImport(importedQuestions);
      toast.success(`${importedQuestions.length} questions added!`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Bulk Import Questions</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Template Download */}
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

      {/* File Upload */}
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

      {/* Processing State */}
      {isProcessing && (
        <div className="p-4 rounded-lg bg-muted/30 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm">Processing file...</p>
        </div>
      )}

      {/* Errors */}
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

      {/* Success Preview */}
      {importedQuestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="font-medium text-sm">
              {importedQuestions.length} questions ready to import
            </span>
          </div>
          
          <ScrollArea className="max-h-40 rounded-lg border">
            <div className="p-2 space-y-2">
              {importedQuestions.slice(0, 5).map((q, i) => (
                <div key={i} className="p-2 rounded bg-muted/30 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">Q{i + 1}</Badge>
                    <Badge variant="secondary" className="text-xs capitalize">{q.difficulty}</Badge>
                    <Badge className="text-xs">Answer: {q.correct_option}</Badge>
                  </div>
                  <p className="text-xs line-clamp-2">{q.question_text}</p>
                </div>
              ))}
              {importedQuestions.length > 5 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  ...and {importedQuestions.length - 5} more questions
                </p>
              )}
            </div>
          </ScrollArea>

          <Button className="w-full" onClick={handleImport}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Import {importedQuestions.length} Questions
          </Button>
        </div>
      )}

      {/* Column Info */}
      <div className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/30">
        <p className="font-medium mb-1">Required columns:</p>
        <p>question_text, option_a, option_b, option_c, option_d, correct_option (A/B/C/D)</p>
        <p className="mt-1 font-medium">Optional columns:</p>
        <p>explanation, difficulty (easy/medium/hard)</p>
      </div>
    </div>
  );
}
