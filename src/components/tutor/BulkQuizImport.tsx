import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Loader2,
  BookOpen,
  Clock,
  Coins
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ImportedQuiz {
  title: string;
  description: string;
  course_code: string;
  course_name: string;
  duration_minutes: number;
  question_count: number;
  is_premium: boolean;
  token_cost: number;
  is_simulation: boolean;
}

interface BulkQuizImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ProcessingStatus {
  stage: "reading" | "parsing" | "validating" | "creating" | "complete";
  progress: number;
  message: string;
  totalRows?: number;
  processedRows?: number;
}

interface Course {
  id: string;
  code: string;
  name: string;
}

export function BulkQuizImport({ open, onOpenChange, onSuccess }: BulkQuizImportProps) {
  const { user } = useAuth();
  const [importedQuizzes, setImportedQuizzes] = useState<ImportedQuiz[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<"upload" | "preview">("upload");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [existingCourses, setExistingCourses] = useState<Course[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing courses on mount
  useState(() => {
    const fetchCourses = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("courses")
        .select("id, code, name")
        .eq("created_by", user.id);
      if (data) setExistingCourses(data);
    };
    fetchCourses();
  });

  const isQuizValid = (q: ImportedQuiz): boolean => {
    return !!(
      q.title.trim() &&
      q.course_code.trim() &&
      q.duration_minutes > 0 &&
      q.question_count > 0
    );
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setErrors([]);
    setImportedQuizzes([]);
    setProcessingStatus({ stage: "reading", progress: 0, message: "Reading file..." });

    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      
      if (!["csv", "xlsx", "xls"].includes(fileExtension || "")) {
        throw new Error("Please upload a CSV or Excel file (.csv, .xlsx, .xls)");
      }

      setProcessingStatus({ stage: "reading", progress: 20, message: `Reading ${file.name}...` });
      
      const data = await file.arrayBuffer();
      
      setProcessingStatus({ stage: "parsing", progress: 40, message: "Parsing spreadsheet data..." });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

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

      const quizzes: ImportedQuiz[] = [];
      const parseErrors: string[] = [];

      for (let index = 0; index < jsonData.length; index++) {
        const row = jsonData[index] as any;
        const rowNum = index + 2;

        if (index % 5 === 0 || index === jsonData.length - 1) {
          const validationProgress = 60 + ((index / jsonData.length) * 35);
          setProcessingStatus({ 
            stage: "validating", 
            progress: validationProgress, 
            message: `Validating row ${index + 1} of ${jsonData.length}...`,
            totalRows: jsonData.length,
            processedRows: index + 1
          });
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        const title = row.title || row.Title || row["Quiz Title"] || "";
        const description = row.description || row.Description || "";
        const courseCode = row.course_code || row.Course_Code || row["Course Code"] || "";
        const courseName = row.course_name || row.Course_Name || row["Course Name"] || "";
        const durationMinutes = parseInt(row.duration_minutes || row.Duration || row["Duration (mins)"] || "30", 10);
        const questionCount = parseInt(row.question_count || row.Questions || row["Question Count"] || "20", 10);
        const isPremium = String(row.is_premium || row.Premium || row["Is Premium"] || "false").toLowerCase() === "true";
        const tokenCost = parseInt(row.token_cost || row.Cost || row["Token Cost"] || "0", 10);
        const isSimulation = String(row.is_simulation || row.Simulation || row["Is Simulation"] || "false").toLowerCase() === "true";

        if (!String(title).trim()) {
          parseErrors.push(`Row ${rowNum}: Missing quiz title`);
          continue;
        }
        if (!String(courseCode).trim()) {
          parseErrors.push(`Row ${rowNum}: Missing course code`);
          continue;
        }
        if (isNaN(durationMinutes) || durationMinutes <= 0) {
          parseErrors.push(`Row ${rowNum}: Invalid duration`);
          continue;
        }
        if (isNaN(questionCount) || questionCount <= 0) {
          parseErrors.push(`Row ${rowNum}: Invalid question count`);
          continue;
        }

        quizzes.push({
          title: String(title).trim(),
          description: String(description).trim(),
          course_code: String(courseCode).trim().toUpperCase(),
          course_name: String(courseName).trim() || String(courseCode).trim().toUpperCase(),
          duration_minutes: durationMinutes,
          question_count: questionCount,
          is_premium: isPremium,
          token_cost: isPremium ? (tokenCost || 5) : 0,
          is_simulation: isSimulation,
        });
      }

      setProcessingStatus({ 
        stage: "complete", 
        progress: 100, 
        message: `Complete! ${quizzes.length} quizzes ready.`,
        totalRows: jsonData.length,
        processedRows: jsonData.length
      });

      setImportedQuizzes(quizzes);
      setErrors(parseErrors);

      if (quizzes.length > 0) {
        toast.success(`Successfully parsed ${quizzes.length} quizzes`);
        setViewMode("preview");
        setPreviewIndex(0);
      } else if (parseErrors.length > 0) {
        toast.error("No valid quizzes found. Check the errors below.");
      }
    } catch (error: any) {
      console.error("File processing error:", error);
      setErrors([error.message || "Failed to process file"]);
      toast.error(error.message || "Failed to process file");
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessingStatus(null), 1500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
      if (["csv", "xlsx", "xls"].includes(fileExtension || "")) {
        processFile(file);
      } else {
        toast.error("Please upload a CSV or Excel file (.csv, .xlsx, .xls)");
      }
    }
  }, []);

  const downloadTemplate = () => {
    const templateData = [
      {
        title: "Introduction to Physics Quiz 1",
        description: "Basic concepts of motion and forces",
        course_code: "PHY101",
        course_name: "Introduction to Physics",
        duration_minutes: 30,
        question_count: 20,
        is_premium: "false",
        token_cost: 0,
        is_simulation: "false",
      },
      {
        title: "Chemistry Midterm Simulation",
        description: "Comprehensive exam covering organic chemistry",
        course_code: "CHM201",
        course_name: "Organic Chemistry",
        duration_minutes: 60,
        question_count: 50,
        is_premium: "true",
        token_cost: 10,
        is_simulation: "true",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Quizzes");
    XLSX.writeFile(workbook, "quiz_import_template.xlsx");
    toast.success("Template downloaded!");
  };

  const deleteQuiz = (index: number) => {
    const updated = importedQuizzes.filter((_, i) => i !== index);
    setImportedQuizzes(updated);
    if (previewIndex >= updated.length && updated.length > 0) {
      setPreviewIndex(updated.length - 1);
    }
    if (updated.length === 0) {
      setViewMode("upload");
    }
    toast.success("Quiz removed");
  };

  const handleCreateQuizzes = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    const validQuizzes = importedQuizzes.filter(isQuizValid);
    if (validQuizzes.length === 0) {
      toast.error("No valid quizzes to create");
      return;
    }

    setIsCreating(true);
    setProcessingStatus({ 
      stage: "creating", 
      progress: 0, 
      message: "Creating quizzes...",
      totalRows: validQuizzes.length,
      processedRows: 0
    });

    let createdCount = 0;
    const createErrors: string[] = [];

    try {
      for (let i = 0; i < validQuizzes.length; i++) {
        const quiz = validQuizzes[i];
        
        setProcessingStatus({ 
          stage: "creating", 
          progress: ((i + 1) / validQuizzes.length) * 100, 
          message: `Creating quiz ${i + 1} of ${validQuizzes.length}...`,
          totalRows: validQuizzes.length,
          processedRows: i + 1
        });

        try {
          // Check if course exists or create it
          let courseId: string;
          const existingCourse = existingCourses.find(
            c => c.code.toUpperCase() === quiz.course_code.toUpperCase()
          );

          if (existingCourse) {
            courseId = existingCourse.id;
          } else {
            // Create new course
            const { data: newCourse, error: courseError } = await supabase
              .from("courses")
              .insert({
                code: quiz.course_code,
                name: quiz.course_name,
                created_by: user.id,
              })
              .select("id")
              .single();

            if (courseError) throw courseError;
            courseId = newCourse.id;
            
            // Add to existing courses cache
            setExistingCourses(prev => [...prev, { 
              id: courseId, 
              code: quiz.course_code, 
              name: quiz.course_name 
            }]);
          }

          // Create the quiz
          const { error: quizError } = await supabase
            .from("quizzes")
            .insert({
              title: quiz.title,
              description: quiz.description || null,
              course_id: courseId,
              tutor_id: user.id,
              duration_minutes: quiz.duration_minutes,
              question_count: quiz.question_count,
              is_premium: quiz.is_premium,
              token_cost: quiz.token_cost,
              is_simulation: quiz.is_simulation,
              is_active: true,
            });

          if (quizError) throw quizError;
          createdCount++;
        } catch (error: any) {
          console.error(`Error creating quiz "${quiz.title}":`, error);
          createErrors.push(`"${quiz.title}": ${error.message}`);
        }
      }

      setProcessingStatus({ 
        stage: "complete", 
        progress: 100, 
        message: `Created ${createdCount} quizzes!`
      });

      if (createdCount > 0) {
        toast.success(`Successfully created ${createdCount} quizzes!`);
        if (createErrors.length > 0) {
          toast.warning(`${createErrors.length} quizzes failed to create`);
        }
        onSuccess();
        onOpenChange(false);
        resetState();
      } else {
        toast.error("Failed to create any quizzes");
        setErrors(createErrors);
      }
    } catch (error: any) {
      console.error("Bulk creation error:", error);
      toast.error(error.message || "Failed to create quizzes");
    } finally {
      setIsCreating(false);
      setTimeout(() => setProcessingStatus(null), 1500);
    }
  };

  const resetState = () => {
    setImportedQuizzes([]);
    setErrors([]);
    setViewMode("upload");
    setPreviewIndex(0);
    setProcessingStatus(null);
  };

  const validCount = importedQuizzes.filter(isQuizValid).length;
  const invalidCount = importedQuizzes.length - validCount;
  const currentQuiz = importedQuizzes[previewIndex];

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Bulk Import Quizzes
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {viewMode === "upload" ? (
            <>
              {/* Template Download */}
              <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm">
                    <p className="font-medium">Download Template</p>
                    <p className="text-xs text-muted-foreground">Get the sample format to fill in your quizzes</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-1" />
                    Template
                  </Button>
                </div>
              </div>

              {/* Upload Area */}
              <div className="space-y-2">
                <Label>Upload File (CSV or Excel)</Label>
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
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
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {isProcessing ? (
                    <div className="space-y-3">
                      <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                      {processingStatus && (
                        <>
                          <Progress value={processingStatus.progress} className="h-2 max-w-xs mx-auto" />
                          <p className="text-sm text-muted-foreground">{processingStatus.message}</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <Upload className={cn(
                        "w-10 h-10 mx-auto mb-3 transition-colors",
                        isDragging ? "text-primary" : "text-muted-foreground"
                      )} />
                      <p className="text-sm font-medium mb-1">
                        {isDragging ? "Drop file here" : "Click to upload or drag and drop"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports CSV, XLSX, XLS files
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-destructive mb-1">Errors found:</p>
                      <ScrollArea className="max-h-32">
                        <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                          {errors.slice(0, 10).map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                          {errors.length > 10 && (
                            <li>...and {errors.length - 10} more errors</li>
                          )}
                        </ul>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              )}

              {/* Format Info */}
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                <p className="font-medium mb-1">Required columns:</p>
                <p><code className="bg-muted px-1 rounded">title</code>, <code className="bg-muted px-1 rounded">course_code</code>, <code className="bg-muted px-1 rounded">duration_minutes</code>, <code className="bg-muted px-1 rounded">question_count</code></p>
                <p className="mt-1"><span className="font-medium">Optional:</span> description, course_name, is_premium, token_cost, is_simulation</p>
              </div>
            </>
          ) : (
            <>
              {/* Preview Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {validCount} valid
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {invalidCount} invalid
                    </Badge>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setViewMode("upload"); setImportedQuizzes([]); }}
                >
                  Upload Different File
                </Button>
              </div>

              {/* Quiz Navigator */}
              <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                  disabled={previewIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium">
                  Quiz {previewIndex + 1} of {importedQuizzes.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewIndex(Math.min(importedQuizzes.length - 1, previewIndex + 1))}
                  disabled={previewIndex === importedQuizzes.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Current Quiz Preview */}
              {currentQuiz && (
                <div className={cn(
                  "p-4 rounded-lg border",
                  isQuizValid(currentQuiz) ? "bg-card" : "bg-destructive/5 border-destructive/20"
                )}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{currentQuiz.title}</h3>
                      <p className="text-sm text-muted-foreground">{currentQuiz.description || "No description"}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteQuiz(previewIndex)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span>{currentQuiz.course_code}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{currentQuiz.duration_minutes} mins</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Questions:</span>
                      <span>{currentQuiz.question_count}</span>
                    </div>
                    {currentQuiz.is_premium && (
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-500" />
                        <span>{currentQuiz.token_cost} tokens</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3">
                    {currentQuiz.is_premium && (
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Premium</Badge>
                    )}
                    {currentQuiz.is_simulation && (
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Simulation</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* All Quizzes List */}
              <div className="space-y-2">
                <Label>All Quizzes ({importedQuizzes.length})</Label>
                <ScrollArea className="h-32 border rounded-lg">
                  <div className="p-2 space-y-1">
                    {importedQuizzes.map((quiz, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center justify-between p-2 rounded cursor-pointer transition-colors",
                          index === previewIndex ? "bg-primary/10" : "hover:bg-muted/50",
                          !isQuizValid(quiz) && "border-l-2 border-destructive"
                        )}
                        onClick={() => setPreviewIndex(index)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                          <span className="truncate text-sm">{quiz.title}</span>
                          <Badge variant="outline" className="text-xs shrink-0">{quiz.course_code}</Badge>
                        </div>
                        {isQuizValid(quiz) ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Processing Status */}
              {processingStatus && processingStatus.stage === "creating" && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm font-medium">{processingStatus.message}</span>
                  </div>
                  <Progress value={processingStatus.progress} className="h-2" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {viewMode === "preview" && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateQuizzes}
              disabled={validCount === 0 || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create {validCount} Quiz{validCount !== 1 ? "zes" : ""}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
