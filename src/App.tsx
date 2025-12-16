import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Eager load landing page for best LCP
import Index from "./pages/Index";

// Lazy load all other pages for code splitting
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const TutorDashboard = lazy(() => import("./pages/tutor/TutorDashboard"));
const TutorProfile = lazy(() => import("./pages/tutor/TutorProfile"));
const BrowseTutors = lazy(() => import("./pages/tutor/BrowseTutors"));
const ApplyTutor = lazy(() => import("./pages/ApplyTutor"));
const TutorApplications = lazy(() => import("./pages/admin/TutorApplications"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const QuizPractice = lazy(() => import("./pages/quiz/QuizPractice"));
const CBTSimulation = lazy(() => import("./pages/quiz/CBTSimulation"));
const QuizResults = lazy(() => import("./pages/quiz/QuizResults"));
const EditProfile = lazy(() => import("./pages/profile/EditProfile"));
const Community = lazy(() => import("./pages/Community"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/tutor/dashboard" element={<TutorDashboard />} />
              <Route path="/tutor/:tutorId" element={<TutorProfile />} />
              <Route path="/tutors" element={<BrowseTutors />} />
              <Route path="/apply-tutor" element={<ApplyTutor />} />
              <Route path="/admin/applications" element={<TutorApplications />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/quiz/:quizId/practice" element={<QuizPractice />} />
              <Route path="/quiz/:quizId/simulation" element={<CBTSimulation />} />
              <Route path="/quiz/:quizId/results/:attemptId" element={<QuizResults />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/community" element={<Community />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
