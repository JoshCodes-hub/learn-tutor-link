import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Camera, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Course {
  id: string;
  code: string;
  name: string;
}

interface CreateQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
  onSuccess: () => void;
}

export function CreateQuizDialog({
  open,
  onOpenChange,
  courses,
  onSuccess,
}: CreateQuizDialogProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [questionCount, setQuestionCount] = useState("20");
  const [isPremium, setIsPremium] = useState(false);
  const [tokenCost, setTokenCost] = useState("10");
  const [availableQuestions, setAvailableQuestions] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [tutorName, setTutorName] = useState<string | null>(null);

  // Fetch tutor profile on open
  useEffect(() => {
    const fetchTutorProfile = async () => {
      if (!user || !open) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("profile_image_url, full_name")
        .eq("id", user.id)
        .single();
      
      if (data) {
        setProfileImageUrl(data.profile_image_url);
        setTutorName(data.full_name);
      }
    };

    fetchTutorProfile();
  }, [user, open]);

  useEffect(() => {
    const fetchQuestionCount = async () => {
      if (!courseId) {
        setAvailableQuestions(0);
        return;
      }

      const { count } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courseId)
        .eq("is_approved", true);

      setAvailableQuestions(count || 0);
    };

    fetchQuestionCount();
  }, [courseId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("tutor-profiles")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("tutor-profiles")
        .getPublicUrl(fileName);

      const newImageUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update both avatar_url and profile_image_url
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          avatar_url: newImageUrl,
          profile_image_url: newImageUrl 
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfileImageUrl(newImageUrl);
      toast.success("Profile image updated!");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title.trim() || !courseId) {
      toast.error("Title and course are required");
      return;
    }

    const qCount = parseInt(questionCount);
    if (qCount > availableQuestions) {
      toast.error(`Only ${availableQuestions} approved questions available for this course`);
      return;
    }

    setIsLoading(true);

    try {
      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          course_id: courseId,
          tutor_id: user.id,
          duration_minutes: parseInt(durationMinutes),
          question_count: qCount,
          is_premium: isPremium,
          token_cost: isPremium ? parseInt(tokenCost) : 0,
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Fetch and link random questions
      if (quiz) {
        const { data: questions, error: questionsError } = await supabase
          .from("questions")
          .select("id")
          .eq("course_id", courseId)
          .eq("is_approved", true)
          .limit(qCount);

        if (questionsError) throw questionsError;

        if (questions && questions.length > 0) {
          const quizQuestions = questions.map((q, index) => ({
            quiz_id: quiz.id,
            question_id: q.id,
            order_index: index,
          }));

          const { error: linkError } = await supabase
            .from("quiz_questions")
            .insert(quizQuestions);

          if (linkError) throw linkError;
        }
      }

      toast.success("Quiz created successfully!");
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error("Error creating quiz:", error);
      toast.error(error.message || "Failed to create quiz");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCourseId("");
    setDurationMinutes("30");
    setQuestionCount("20");
    setIsPremium(false);
    setTokenCost("10");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Quiz</DialogTitle>
          <DialogDescription>
            Create a quiz from your uploaded questions.
          </DialogDescription>
        </DialogHeader>

        {/* Tutor Profile Section */}
        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border">
          <div className="relative group">
            <Avatar className="w-16 h-16 border-2 border-primary/30">
              <AvatarImage src={profileImageUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg font-bold">
                {tutorName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || <User className="w-6 h-6" />}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {isUploadingImage ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">{tutorName || "Your Name"}</p>
            <p className="text-sm text-muted-foreground">Quiz will display "by {tutorName || 'you'}"</p>
            {!profileImageUrl && (
              <p className="text-xs text-amber-600 mt-1">Upload a photo to appear on quiz cards</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="course">Course *</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {courseId && (
              <p className="text-sm text-muted-foreground">
                {availableQuestions} approved questions available
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Quiz Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Chapter 1 - Motion"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of this quiz..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="5"
                max="180"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="questionCount">Number of Questions</Label>
              <Input
                id="questionCount"
                type="number"
                min="1"
                max={availableQuestions || 100}
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <Label htmlFor="premium">Premium Quiz</Label>
              <p className="text-sm text-muted-foreground">
                Charge tokens for this quiz
              </p>
            </div>
            <Switch
              id="premium"
              checked={isPremium}
              onCheckedChange={setIsPremium}
            />
          </div>

          {isPremium && (
            <div className="space-y-2">
              <Label htmlFor="tokenCost">Token Cost</Label>
              <Input
                id="tokenCost"
                type="number"
                min="1"
                max="100"
                value={tokenCost}
                onChange={(e) => setTokenCost(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || courses.length === 0}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Quiz
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
