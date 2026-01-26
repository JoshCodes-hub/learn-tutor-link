import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import PageTransition from "./PageTransition";

// Eager load landing page for best LCP
import Index from "@/pages/Index";

// Lazy load all other pages for code splitting
const Auth = lazy(() => import("@/pages/Auth"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const StudentDashboard = lazy(() => import("@/pages/student/StudentDashboard"));
const TutorDashboard = lazy(() => import("@/pages/tutor/TutorDashboard"));
const TutorProfile = lazy(() => import("@/pages/tutor/TutorProfile"));
const BrowseTutors = lazy(() => import("@/pages/tutor/BrowseTutors"));
const ApplyTutor = lazy(() => import("@/pages/ApplyTutor"));
const TutorApplications = lazy(() => import("@/pages/admin/TutorApplications"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const QuizPreview = lazy(() => import("@/pages/quiz/QuizPreview"));
const QuizPractice = lazy(() => import("@/pages/quiz/QuizPractice"));
const CBTSimulation = lazy(() => import("@/pages/quiz/CBTSimulation"));
const QuizResults = lazy(() => import("@/pages/quiz/QuizResults"));
const EditProfile = lazy(() => import("@/pages/profile/EditProfile"));
const Community = lazy(() => import("@/pages/Community"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));
const TeamStatsPage = lazy(() => import("@/pages/TeamStatsPage"));
const CommunityView = lazy(() => import("@/pages/community/CommunityView"));
const NotFound = lazy(() => import("@/pages/NotFound"));

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense fallback={<LoadingSpinner />} key={location.pathname}>
        <Routes location={location}>
          <Route
            path="/"
            element={
              <PageTransition>
                <Index />
              </PageTransition>
            }
          />
          <Route
            path="/auth"
            element={
              <PageTransition>
                <Auth />
              </PageTransition>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PageTransition>
                <Dashboard />
              </PageTransition>
            }
          />
          <Route
            path="/student/dashboard"
            element={
              <PageTransition>
                <StudentDashboard />
              </PageTransition>
            }
          />
          <Route
            path="/tutor/dashboard"
            element={
              <PageTransition>
                <TutorDashboard />
              </PageTransition>
            }
          />
          <Route
            path="/tutor/:tutorId"
            element={
              <PageTransition>
                <TutorProfile />
              </PageTransition>
            }
          />
          <Route
            path="/tutors"
            element={
              <PageTransition>
                <BrowseTutors />
              </PageTransition>
            }
          />
          <Route
            path="/apply-tutor"
            element={
              <PageTransition>
                <ApplyTutor />
              </PageTransition>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <PageTransition>
                <TutorApplications />
              </PageTransition>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <PageTransition>
                <AdminDashboard />
              </PageTransition>
            }
          />
          <Route
            path="/quiz/:quizId"
            element={
              <PageTransition>
                <QuizPreview />
              </PageTransition>
            }
          />
          <Route
            path="/quiz/:quizId/practice"
            element={
              <PageTransition>
                <QuizPractice />
              </PageTransition>
            }
          />
          <Route
            path="/quiz/:quizId/simulation"
            element={
              <PageTransition>
                <CBTSimulation />
              </PageTransition>
            }
          />
          <Route
            path="/quiz/:quizId/results/:attemptId"
            element={
              <PageTransition>
                <QuizResults />
              </PageTransition>
            }
          />
          <Route
            path="/profile/edit"
            element={
              <PageTransition>
                <EditProfile />
              </PageTransition>
            }
          />
          <Route
            path="/community"
            element={
              <PageTransition>
                <Community />
              </PageTransition>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <PageTransition>
                <LeaderboardPage />
              </PageTransition>
            }
          />
          <Route
            path="/team/stats"
            element={
              <PageTransition>
                <TeamStatsPage />
              </PageTransition>
            }
          />
          <Route
            path="/community/:communityId"
            element={
              <PageTransition>
                <CommunityView />
              </PageTransition>
            }
          />
          <Route
            path="*"
            element={
              <PageTransition>
                <NotFound />
              </PageTransition>
            }
          />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
