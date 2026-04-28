import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import PageTransition from "./PageTransition";
import { AcademicPathGate } from "@/components/auth/AcademicPathGate";
import { FEATURES } from "@/config/features";
import ComingSoon from "@/pages/ComingSoon";

// Eager load the native welcome screen for best LCP (new `/`)
import Welcome from "@/pages/app/Welcome";
const Index = lazy(() => import("@/pages/Index"));

// School module
const SchoolRegister = lazy(() => import("@/pages/school/Register"));
const SchoolPending = lazy(() => import("@/pages/school/Pending"));
const SchoolDashboard = lazy(() => import("@/pages/school/Dashboard"));
const SchoolClasses = lazy(() => import("@/pages/school/Classes"));
const SchoolStudents = lazy(() => import("@/pages/school/Students"));
const SchoolAttendance = lazy(() => import("@/pages/school/Attendance"));
const SchoolFees = lazy(() => import("@/pages/school/Fees"));
const SchoolResults = lazy(() => import("@/pages/school/Results"));
const SchoolAnnouncements = lazy(() => import("@/pages/school/Announcements"));
const SchoolSettings = lazy(() => import("@/pages/school/Settings"));
const SchoolStub = lazy(() => import("@/pages/school/Stub"));
const AdminSchoolApplications = lazy(() => import("@/pages/admin/SchoolApplications"));
const ParentDashboard = lazy(() => import("@/pages/parent/ParentDashboard"));

const ChoosePath = lazy(() => import("@/pages/onboarding/ChoosePath"));
const RefinePath = lazy(() => import("@/pages/onboarding/RefinePath"));
const TutorMatching = lazy(() => import("@/pages/onboarding/TutorMatching"));
const SubjectBrowser = lazy(() => import("@/pages/subjects/SubjectBrowser"));
const Flashcards = lazy(() => import("@/pages/flashcards/Flashcards"));
const JambIntelligence = lazy(() => import("@/pages/jamb/JambIntelligence"));
const SurvivalKits = lazy(() => import("@/pages/survival-kits/SurvivalKits"));
const SurvivalKitView = lazy(() => import("@/pages/survival-kits/SurvivalKitView"));
const Strategy = lazy(() => import("@/pages/strategy/Strategy"));
const AITutor = lazy(() => import("@/pages/ai-tutor/AITutor"));
const ViralMode = lazy(() => import("@/pages/viral/ViralMode"));

// Lazy load all other pages for code splitting
const Auth = lazy(() => import("@/pages/Auth"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const StudentDashboard = lazy(() => import("@/pages/student/StudentDashboard"));
const ExamReadiness = lazy(() => import("@/pages/student/ExamReadiness"));
const WeakAreaDrill = lazy(() => import("@/pages/student/WeakAreaDrill"));
const MasteryBreakdown = lazy(() => import("@/pages/student/MasteryBreakdown"));
const OfflinePractice = lazy(() => import("@/pages/student/OfflinePractice"));
const OfflineRunner = lazy(() => import("@/pages/student/OfflineRunner"));
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
const TheoryPrep = lazy(() => import("@/pages/theory/TheoryPrep"));
const TheoryCourseView = lazy(() => import("@/pages/theory/TheoryCourseView"));
const TheoryQuestionView = lazy(() => import("@/pages/theory/TheoryQuestionView"));
const StudyHub = lazy(() => import("@/pages/study-hub/StudyHub"));
const StudyHubCourse = lazy(() => import("@/pages/study-hub/StudyHubCourse"));
const PQIntelligence = lazy(() => import("@/pages/study-hub/PQIntelligence"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const StartupChecklist = lazy(() => import("@/pages/admin/StartupChecklist"));

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense fallback={<LoadingSpinner />} key={location.pathname}>
       <AcademicPathGate>
        <Routes location={location}>
          <Route path="/" element={<PageTransition><Welcome /></PageTransition>} />
          <Route path="/website" element={<PageTransition><Index /></PageTransition>} />
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
            path="/admin/startup-checklist"
            element={
              <PageTransition>
                <StartupChecklist />
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
          <Route path="/theory" element={<PageTransition><TheoryPrep /></PageTransition>} />
          <Route path="/theory/:courseId" element={<PageTransition><TheoryCourseView /></PageTransition>} />
          <Route path="/theory/question/:questionId" element={<PageTransition><TheoryQuestionView /></PageTransition>} />
          <Route path="/student/readiness" element={<PageTransition><ExamReadiness /></PageTransition>} />
          <Route path="/student/weak/:courseId" element={<PageTransition><WeakAreaDrill /></PageTransition>} />
          <Route path="/student/mastery" element={<PageTransition><MasteryBreakdown /></PageTransition>} />
          <Route path="/student/offline" element={<PageTransition><OfflinePractice /></PageTransition>} />
          <Route path="/student/offline/:setId" element={<PageTransition><OfflineRunner /></PageTransition>} />
          <Route path="/study-hub" element={<PageTransition><StudyHub /></PageTransition>} />
          <Route path="/study-hub/:courseId" element={<PageTransition><StudyHubCourse /></PageTransition>} />
          <Route path="/pq-intelligence/:courseId" element={<PageTransition><PQIntelligence /></PageTransition>} />
          <Route path="/onboarding/path" element={<PageTransition><ChoosePath /></PageTransition>} />
          <Route path="/onboarding/refine" element={<PageTransition><RefinePath /></PageTransition>} />
          <Route path="/onboarding/match" element={<PageTransition><TutorMatching /></PageTransition>} />
          <Route path="/subjects" element={<PageTransition><SubjectBrowser /></PageTransition>} />
          <Route path="/flashcards" element={<PageTransition><Flashcards /></PageTransition>} />
          <Route
            path="/jamb-intelligence"
            element={
              <PageTransition>
                {FEATURES.jamb ? <JambIntelligence /> : <ComingSoon title="JAMB Intelligence" note="We're putting the finishing touches on the JAMB track. It'll be back soon." />}
              </PageTransition>
            }
          />

          {/* School Management */}
          <Route path="/school/register" element={<PageTransition><SchoolRegister /></PageTransition>} />
          <Route path="/school/pending" element={<PageTransition><SchoolPending /></PageTransition>} />
          <Route path="/school/dashboard" element={<PageTransition><SchoolDashboard /></PageTransition>} />
          <Route path="/school/classes" element={<PageTransition><SchoolClasses /></PageTransition>} />
          <Route path="/school/students" element={<PageTransition><SchoolStudents /></PageTransition>} />
          <Route path="/school/teachers" element={<PageTransition><SchoolStub title="Teachers" /></PageTransition>} />
          <Route path="/school/attendance" element={<PageTransition><SchoolAttendance /></PageTransition>} />
          <Route path="/school/results" element={<PageTransition><SchoolResults /></PageTransition>} />
          <Route path="/school/fees" element={<PageTransition><SchoolFees /></PageTransition>} />
          <Route path="/school/timetable" element={<PageTransition><SchoolStub title="Timetable" /></PageTransition>} />
          <Route path="/school/announcements" element={<PageTransition><SchoolAnnouncements /></PageTransition>} />
          <Route path="/school/settings" element={<PageTransition><SchoolSettings /></PageTransition>} />
          <Route path="/admin/schools" element={<PageTransition><AdminSchoolApplications /></PageTransition>} />
          <Route path="/parent/dashboard" element={<PageTransition><ParentDashboard /></PageTransition>} />
          <Route path="/survival-kits" element={<PageTransition><SurvivalKits /></PageTransition>} />
          <Route path="/survival-kits/:kitId" element={<PageTransition><SurvivalKitView /></PageTransition>} />
          <Route path="/strategy" element={<PageTransition><Strategy /></PageTransition>} />
          <Route path="/ai-tutor" element={<PageTransition><AITutor /></PageTransition>} />
          <Route path="/exam-tomorrow" element={<PageTransition><ViralMode /></PageTransition>} />
          <Route path="/can-i-pass" element={<PageTransition><ViralMode /></PageTransition>} />
          <Route path="/two-hours-left" element={<PageTransition><ViralMode /></PageTransition>} />
          <Route
            path="*"
            element={
              <PageTransition>
                <NotFound />
              </PageTransition>
            }
          />
        </Routes>
       </AcademicPathGate>
      </Suspense>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
