import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  UserMinus,
  Clock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface TutorApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  qualifications: string;
  experience: string;
  courses_to_teach: string;
  bio: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
}

interface Tutor {
  user_id: string;
  profile: {
    full_name: string | null;
    email: string;
    department: string | null;
  };
  courses_count: number;
  questions_count: number;
  total_earnings: number;
}

export function TutorManagement() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<TutorApplication[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<TutorApplication | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeView, setActiveView] = useState<"applications" | "tutors">("applications");

  const fetchData = async () => {
    try {
      // Fetch pending applications
      const { data: appsData } = await supabase
        .from("tutor_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (appsData) {
        setApplications(appsData as TutorApplication[]);
      }

      // Fetch active tutors
      const { data: tutorRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "tutor");

      if (tutorRoles) {
        const tutorsWithData = await Promise.all(
          tutorRoles.map(async (role) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, email, department")
              .eq("id", role.user_id)
              .single();

            const { count: coursesCount } = await supabase
              .from("courses")
              .select("*", { count: "exact", head: true })
              .eq("created_by", role.user_id);

            const { count: questionsCount } = await supabase
              .from("questions")
              .select("*", { count: "exact", head: true })
              .eq("tutor_id", role.user_id);

            // Calculate earnings from premium quizzes
            const { data: quizzes } = await supabase
              .from("quizzes")
              .select("id, token_cost")
              .eq("tutor_id", role.user_id)
              .eq("is_premium", true);

            let totalEarnings = 0;
            if (quizzes) {
              for (const quiz of quizzes) {
                const { count } = await supabase
                  .from("quiz_attempts")
                  .select("*", { count: "exact", head: true })
                  .eq("quiz_id", quiz.id);
                totalEarnings += (count || 0) * quiz.token_cost * 0.8; // 80% to tutor
              }
            }

            return {
              user_id: role.user_id,
              profile: profile || { full_name: null, email: "", department: null },
              courses_count: coursesCount || 0,
              questions_count: questionsCount || 0,
              total_earnings: Math.round(totalEarnings),
            };
          })
        );

        setTutors(tutorsWithData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async () => {
    if (!selectedApp || !user) return;
    setIsProcessing(true);

    try {
      // Update application status
      const { error: updateError } = await supabase
        .from("tutor_applications")
        .update({
          status: "approved",
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", selectedApp.id);

      if (updateError) throw updateError;

      // Add tutor role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: selectedApp.user_id,
        role: "tutor",
      });

      if (roleError) throw roleError;

      toast.success("Tutor application approved!");
      setSelectedApp(null);
      setAdminNotes("");
      fetchData();
    } catch (error: any) {
      console.error("Error approving application:", error);
      toast.error(error.message || "Failed to approve application");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !user) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from("tutor_applications")
        .update({
          status: "rejected",
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", selectedApp.id);

      if (error) throw error;

      toast.success("Application rejected");
      setSelectedApp(null);
      setAdminNotes("");
      fetchData();
    } catch (error: any) {
      console.error("Error rejecting application:", error);
      toast.error(error.message || "Failed to reject application");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeTutor = async (userId: string) => {
    if (!confirm("Are you sure you want to revoke this tutor's access?")) return;

    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "tutor");

      if (error) throw error;

      toast.success("Tutor access revoked");
      fetchData();
    } catch (error: any) {
      console.error("Error revoking tutor:", error);
      toast.error(error.message || "Failed to revoke tutor access");
    }
  };

  const pendingApps = applications.filter((a) => a.status === "pending");
  const filteredTutors = tutors.filter(
    (t) =>
      t.profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.profile.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex gap-2">
        <Button
          variant={activeView === "applications" ? "default" : "outline"}
          onClick={() => setActiveView("applications")}
        >
          Applications ({pendingApps.length} pending)
        </Button>
        <Button
          variant={activeView === "tutors" ? "default" : "outline"}
          onClick={() => setActiveView("tutors")}
        >
          Active Tutors ({tutors.length})
        </Button>
      </div>

      {activeView === "applications" ? (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Qualifications</TableHead>
                <TableHead>Courses</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No applications found
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{app.full_name}</p>
                        <p className="text-sm text-muted-foreground">{app.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{app.qualifications}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{app.courses_to_teach}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          app.status === "approved"
                            ? "default"
                            : app.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {app.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                        {app.status === "approved" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {app.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(app.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedApp(app);
                          setAdminNotes(app.admin_notes || "");
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tutors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tutor</TableHead>
                  <TableHead className="text-center">Courses</TableHead>
                  <TableHead className="text-center">Questions</TableHead>
                  <TableHead className="text-center">Earnings</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTutors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No tutors found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTutors.map((tutor) => (
                    <TableRow key={tutor.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">
                            {tutor.profile.full_name || "Unknown"}
                          </p>
                          <p className="text-sm text-muted-foreground">{tutor.profile.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{tutor.courses_count}</TableCell>
                      <TableCell className="text-center">{tutor.questions_count}</TableCell>
                      <TableCell className="text-center font-medium text-accent">
                        {tutor.total_earnings} tokens
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRevokeTutor(tutor.user_id)}
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Application Review Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
            <DialogDescription>
              Review this tutor application and approve or reject it.
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium text-foreground">{selectedApp.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground">{selectedApp.email}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Qualifications</p>
                <p className="text-foreground bg-muted/30 p-3 rounded-lg">
                  {selectedApp.qualifications}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Teaching Experience</p>
                <p className="text-foreground bg-muted/30 p-3 rounded-lg">
                  {selectedApp.experience}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Courses to Teach</p>
                <p className="text-foreground bg-muted/30 p-3 rounded-lg">
                  {selectedApp.courses_to_teach}
                </p>
              </div>

              {selectedApp.bio && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Bio</p>
                  <p className="text-foreground bg-muted/30 p-3 rounded-lg">{selectedApp.bio}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-1">Admin Notes</p>
                <Textarea
                  placeholder="Add notes about this application..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  disabled={selectedApp.status !== "pending"}
                />
              </div>

              {selectedApp.status !== "pending" && (
                <div className="bg-muted/30 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    This application was{" "}
                    <span
                      className={
                        selectedApp.status === "approved" ? "text-success" : "text-destructive"
                      }
                    >
                      {selectedApp.status}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedApp?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isProcessing}
                >
                  {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button onClick={handleApprove} disabled={isProcessing}>
                  {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}