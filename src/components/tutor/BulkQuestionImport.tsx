import { useState, useRef, useCallback } from "react";
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
  Eye,
  FileDown,
  Loader2,
  Image
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { supabase } from "@/integrations/supabase/client";

interface ImportedQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  image_url?: string;
}

interface BulkQuestionImportProps {
  onImport: (questions: ImportedQuestion[]) => void;
  onClose: () => void;
  courseId?: string;
  tutorId?: string;
}

type ViewMode = "upload" | "preview" | "edit";

interface ProcessingStatus {
  stage: "reading" | "parsing" | "validating" | "complete";
  progress: number;
  message: string;
  totalRows?: number;
  processedRows?: number;
}

export function BulkQuestionImport({ onImport, onClose, courseId, tutorId }: BulkQuestionImportProps) {
  const [importedQuestions, setImportedQuestions] = useState<ImportedQuestion[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("upload");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
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

  // Parse Word document tables to JSON
  const parseWordDocument = async (file: File): Promise<any[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;
    
    // Create a temporary DOM element to parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const tables = doc.querySelectorAll("table");
    
    if (tables.length === 0) {
      throw new Error("No tables found in the Word document. Please ensure your document contains a table with question data.");
    }
    
    const jsonData: any[] = [];
    const table = tables[0]; // Use the first table
    const rows = table.querySelectorAll("tr");
    
    if (rows.length < 2) {
      throw new Error("Table must have at least a header row and one data row.");
    }
    
    // Get headers from first row
    const headerRow = rows[0];
    const headers: string[] = [];
    headerRow.querySelectorAll("th, td").forEach((cell) => {
      headers.push((cell.textContent || "").trim().toLowerCase().replace(/\s+/g, "_"));
    });
    
    // Parse data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.querySelectorAll("td");
      const rowData: any = {};
      
      cells.forEach((cell, index) => {
        if (index < headers.length) {
          rowData[headers[index]] = (cell.textContent || "").trim();
        }
      });
      
      // Only add if row has some data
      if (Object.values(rowData).some(v => v)) {
        jsonData.push(rowData);
      }
    }
    
    return jsonData;
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setErrors([]);
    setImportedQuestions([]);
    setProcessingStatus({ stage: "reading", progress: 0, message: "Reading file..." });

    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      
      if (!["csv", "xlsx", "xls", "docx"].includes(fileExtension || "")) {
        throw new Error("Please upload a CSV, Excel, or Word file (.csv, .xlsx, .xls, .docx)");
      }

      // Stage 1: Reading file
      setProcessingStatus({ stage: "reading", progress: 20, message: `Reading ${file.name}...` });
      
      let jsonData: any[];
      
      if (fileExtension === "docx") {
        setProcessingStatus({ stage: "parsing", progress: 40, message: "Extracting tables from Word document..." });
        jsonData = await parseWordDocument(file);
      } else {
        const data = await file.arrayBuffer();
        setProcessingStatus({ stage: "parsing", progress: 40, message: "Parsing spreadsheet data..." });
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      }

      if (jsonData.length === 0) {
        throw new Error("The file appears to be empty");
      }

      setProcessingStatus({ 
        stage: "validating", 
        progress: 60, 
        message: `Validating ${jsonData.length} rows...`,
        totalRows: jsonData.length,
        processedRows: 0
      });

      const questions: ImportedQuestion[] = [];
      const parseErrors: string[] = [];

      // Process rows with progress updates
      for (let index = 0; index < jsonData.length; index++) {
        const row = jsonData[index] as any;
        const rowNum = index + 2;

        // Update progress every 10 rows or on the last row
        if (index % 10 === 0 || index === jsonData.length - 1) {
          const validationProgress = 60 + ((index / jsonData.length) * 35);
          setProcessingStatus({ 
            stage: "validating", 
            progress: validationProgress, 
            message: `Validating row ${index + 1} of ${jsonData.length}...`,
            totalRows: jsonData.length,
            processedRows: index + 1
          });
          // Small yield to allow UI to update
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        const questionText = row.question_text || row.question || row.Question || row["Question Text"] || "";
        const optionA = row.option_a || row.Option_A || row["Option A"] || row.A || "";
        const optionB = row.option_b || row.Option_B || row["Option B"] || row.B || "";
        const optionC = row.option_c || row.Option_C || row["Option C"] || row.C || "";
        const optionD = row.option_d || row.Option_D || row["Option D"] || row.D || "";
        const correctOption = row.correct_option || row.correct || row.Correct || row["Correct Option"] || row.Answer || "";
        const explanation = row.explanation || row.Explanation || "";
        const difficulty = row.difficulty || row.Difficulty || "medium";
        const imageUrl = row.image_url || row.Image_URL || row["Image URL"] || row.image || "";

        if (!String(questionText).trim()) {
          parseErrors.push(`Row ${rowNum}: Missing question text`);
          continue;
        }
        if (!String(optionA).trim() || !String(optionB).trim() || !String(optionC).trim() || !String(optionD).trim()) {
          parseErrors.push(`Row ${rowNum}: Missing one or more options`);
          continue;
        }

        const normalizedCorrect = normalizeCorrectOption(correctOption);
        if (!normalizedCorrect) {
          parseErrors.push(`Row ${rowNum}: Invalid correct option "${correctOption}" (must be A, B, C, or D)`);
          continue;
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
          image_url: String(imageUrl).trim() || undefined,
        });
      }

      setProcessingStatus({ 
        stage: "complete", 
        progress: 100, 
        message: `Complete! ${questions.length} questions ready.`,
        totalRows: jsonData.length,
        processedRows: jsonData.length
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
      // Clear processing status after a short delay
      setTimeout(() => setProcessingStatus(null), 1500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      if (["csv", "xlsx", "xls", "docx"].includes(fileExtension || "")) {
        processFile(file);
      } else {
        toast.error("Please upload a CSV, Excel, or Word file (.csv, .xlsx, .xls, .docx)");
      }
    }
  }, []);

  // Export existing questions with watermark
  const exportQuestions = async (format: "csv" | "excel") => {
    if (!courseId || !tutorId) {
      toast.error("Course selection required to export questions");
      return;
    }

    setIsExporting(true);
    try {
      const { data: questions, error } = await supabase
        .from("questions")
        .select("question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, image_url")
        .eq("course_id", courseId)
        .eq("tutor_id", tutorId);

      if (error) throw error;

      if (!questions || questions.length === 0) {
        toast.error("No questions found to export");
        return;
      }

      // Add watermark row at the top
      const watermarkRow = {
        question_text: "📚 Exported from OverraPrep AI - FUTA | https://quiz-nest-ai.lovable.app",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_option: "",
        explanation: `Export Date: ${new Date().toLocaleDateString()} | Total Questions: ${questions.length}`,
        difficulty: "",
        image_url: "",
      };

      const exportData = [
        watermarkRow,
        ...questions.map(q => ({
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option,
          explanation: q.explanation || "",
          difficulty: q.difficulty,
          image_url: (q as any).image_url || "",
        }))
      ];

      if (format === "excel") {
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        
        // Set column widths for better readability
        worksheet['!cols'] = [
          { wch: 50 }, // question_text
          { wch: 25 }, // option_a
          { wch: 25 }, // option_b
          { wch: 25 }, // option_c
          { wch: 25 }, // option_d
          { wch: 10 }, // correct_option
          { wch: 40 }, // explanation
          { wch: 10 }, // difficulty
          { wch: 40 }, // image_url
        ];
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
        
        // Add info sheet with watermark
        const infoData = [
          { info: "OverraPrep AI - FUTA" },
          { info: "Quiz Question Export" },
          { info: `Exported on: ${new Date().toLocaleString()}` },
          { info: `Total Questions: ${questions.length}` },
          { info: "https://quiz-nest-ai.lovable.app" },
          { info: "" },
          { info: "Note: The image_url column is optional. Use it only for questions that require diagrams or images." },
        ];
        const infoSheet = XLSX.utils.json_to_sheet(infoData);
        XLSX.utils.book_append_sheet(workbook, infoSheet, "Info");
        
        XLSX.writeFile(workbook, `OverraPrep_Questions_${new Date().toISOString().split("T")[0]}.xlsx`);
      } else {
        // CSV export with watermark
        const headers = Object.keys(exportData[0]).join(",");
        const rows = exportData.map(row => 
          Object.values(row).map(val => {
            const cellValue = String(val);
            if (cellValue.includes(",") || cellValue.includes('"') || cellValue.includes("\n")) {
              return `"${cellValue.replace(/"/g, '""')}"`;
            }
            return cellValue;
          }).join(",")
        );
        const csvContent = [headers, ...rows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `OverraPrep_Questions_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast.success(`Exported ${questions.length} questions with watermark!`);
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || "Failed to export questions");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadTemplate = () => {
    // Watermark row
    const watermarkRow = {
      question_text: "📚 OverraPrep AI - FUTA Question Template | https://quiz-nest-ai.lovable.app",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_option: "",
      explanation: "DELETE THIS ROW before importing. Fill in your questions below following the format.",
      difficulty: "",
      image_url: "(Optional) Add image URL for diagrams",
    };

    const templateData = [
      watermarkRow,
      {
        question_text: "What is the capital of Nigeria?",
        option_a: "Lagos",
        option_b: "Abuja",
        option_c: "Kano",
        option_d: "Port Harcourt",
        correct_option: "B",
        explanation: "Abuja became the capital of Nigeria on December 12, 1991, replacing Lagos.",
        difficulty: "easy",
        image_url: "",
      },
      {
        question_text: "In a simple pendulum experiment, the period T is related to the length L by which formula?",
        option_a: "T = 2π√(L/g)",
        option_b: "T = 2π√(g/L)",
        option_c: "T = π√(L/g)",
        option_d: "T = 2π(L/g)",
        correct_option: "A",
        explanation: "The period of a simple pendulum is T = 2π√(L/g), where g is the acceleration due to gravity.",
        difficulty: "medium",
        image_url: "https://example.com/pendulum-diagram.png",
      },
      {
        question_text: "From the circuit diagram shown, calculate the total resistance when R1=4Ω and R2=6Ω are connected in parallel.",
        option_a: "10Ω",
        option_b: "2.4Ω",
        option_c: "24Ω",
        option_d: "1.5Ω",
        correct_option: "B",
        explanation: "For parallel resistors: 1/Rtotal = 1/R1 + 1/R2 = 1/4 + 1/6 = 5/12. Therefore Rtotal = 12/5 = 2.4Ω",
        difficulty: "hard",
        image_url: "https://example.com/parallel-circuit.png",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 60 }, // question_text
      { wch: 25 }, // option_a
      { wch: 25 }, // option_b
      { wch: 25 }, // option_c
      { wch: 25 }, // option_d
      { wch: 12 }, // correct_option
      { wch: 50 }, // explanation
      { wch: 10 }, // difficulty
      { wch: 45 }, // image_url
    ];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
    
    // Add instructions sheet
    const instructionsData = [
      { instruction: "📚 OverraPrep AI - FUTA" },
      { instruction: "Question Import Template Instructions" },
      { instruction: "" },
      { instruction: "REQUIRED COLUMNS:" },
      { instruction: "• question_text - The full question text" },
      { instruction: "• option_a, option_b, option_c, option_d - Four answer options" },
      { instruction: "• correct_option - The correct answer (A, B, C, or D)" },
      { instruction: "" },
      { instruction: "OPTIONAL COLUMNS:" },
      { instruction: "• explanation - Explanation for the correct answer" },
      { instruction: "• difficulty - easy, medium, or hard (defaults to medium)" },
      { instruction: "• image_url - URL to an image/diagram for the question" },
      { instruction: "" },
      { instruction: "IMPORTANT NOTES:" },
      { instruction: "1. Delete the first watermark row before importing" },
      { instruction: "2. The image_url column is optional - use it only for questions with diagrams" },
      { instruction: "3. Image URLs must be publicly accessible" },
      { instruction: "4. Supported file formats: .xlsx, .xls, .csv" },
      { instruction: "" },
      { instruction: "Website: https://quiz-nest-ai.lovable.app" },
    ];
    const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 70 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");
    
    XLSX.writeFile(workbook, "OverraPrep_Question_Template.xlsx");
    toast.success("Template with 3 sample questions downloaded!");
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

        {/* Template & Export Row */}
        <div className="flex gap-2">
          <div className="flex-1 p-3 rounded-lg bg-muted/50 border border-dashed">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm">
                <p className="font-medium">Template</p>
                <p className="text-xs text-muted-foreground">Download sample format</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-1" />
                Get
              </Button>
            </div>
          </div>
          
          {courseId && tutorId && (
            <div className="flex-1 p-3 rounded-lg bg-muted/50 border border-dashed">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm">
                  <p className="font-medium">Export</p>
                  <p className="text-xs text-muted-foreground">Download existing</p>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => exportQuestions("csv")}
                    disabled={isExporting}
                  >
                    CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => exportQuestions("excel")}
                    disabled={isExporting}
                  >
                    Excel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Upload File (CSV, Excel, or Word)</Label>
          <div 
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer",
              isDragging 
                ? "border-primary bg-primary/5 scale-[1.02]" 
                : "hover:border-primary/50"
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className={cn(
              "w-8 h-8 mx-auto mb-2 transition-colors",
              isDragging ? "text-primary" : "text-muted-foreground"
            )} />
            <p className="text-sm font-medium">
              {isDragging ? "Drop file here" : "Click to upload or drag and drop"}
            </p>
            <p className="text-xs text-muted-foreground">CSV, Excel, or Word (.docx) files</p>
          </div>
        </div>

        {isProcessing && processingStatus && (
          <div className="p-4 rounded-lg bg-muted/30 space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{processingStatus.message}</p>
                {processingStatus.totalRows && (
                  <p className="text-xs text-muted-foreground">
                    {processingStatus.processedRows} of {processingStatus.totalRows} rows processed
                  </p>
                )}
              </div>
              <Badge variant="outline" className="capitalize">
                {processingStatus.stage}
              </Badge>
            </div>
            <Progress value={processingStatus.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Reading</span>
              <span>Parsing</span>
              <span>Validating</span>
              <span>Complete</span>
            </div>
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
          <p>explanation, difficulty (easy/medium/hard), image_url (for diagrams)</p>
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

          {currentQuestion.image_url && (
            <div className="relative rounded-lg border overflow-hidden bg-muted/30 p-2">
              <p className="text-xs text-muted-foreground mb-1">📷 Question Image:</p>
              <img 
                src={currentQuestion.image_url} 
                alt="Question diagram"
                className="max-h-32 mx-auto object-contain rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Image URL 
                  <Badge variant="outline" className="text-xs font-normal">Optional</Badge>
                </Label>
                <Input
                  value={editQuestion.image_url || ""}
                  onChange={(e) => updateQuestion(editingIndex, "image_url", e.target.value)}
                  placeholder="https://example.com/diagram.png"
                />
              </div>
            </div>

            {/* Image Preview */}
            {editQuestion.image_url && (
              <div className="relative rounded-lg border overflow-hidden bg-muted/30 p-2">
                <p className="text-xs text-muted-foreground mb-1">Image Preview:</p>
                <img 
                  src={editQuestion.image_url} 
                  alt="Question diagram"
                  className="max-h-32 mx-auto object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
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
