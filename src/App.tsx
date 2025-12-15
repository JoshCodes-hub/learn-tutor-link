import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import StudentDashboard from "./pages/student/StudentDashboard";
import TutorDashboard from "./pages/tutor/TutorDashboard";
import ApplyTutor from "./pages/ApplyTutor";
import TutorApplications from "./pages/admin/TutorApplications";
import QuizPractice from "./pages/quiz/QuizPractice";
import CBTSimulation from "./pages/quiz/CBTSimulation";
import QuizResults from "./pages/quiz/QuizResults";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/tutor/dashboard" element={<TutorDashboard />} />
            <Route path="/apply-tutor" element={<ApplyTutor />} />
            <Route path="/admin/applications" element={<TutorApplications />} />
            <Route path="/quiz/:quizId/practice" element={<QuizPractice />} />
            <Route path="/quiz/:quizId/simulation" element={<CBTSimulation />} />
            <Route path="/quiz/:quizId/results/:attemptId" element={<QuizResults />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
