import Landing from "./Pages/Landing/Landing";
import Dashboard from "@/Pages/Dashboard";
import Courses from "@/Pages/Courses";
import Communities from "@/Pages/Communities";
import Leaderboard from "@/components/Leaderboard/Leaderboard";
import Shop from "@/Pages/Shop";
import AI from "@/Pages/AI";
import ProfilePage from "@/Pages/Profile";
import { Outlet, Route, Routes } from "react-router-dom";
import CourseShow from "@/Pages/Courses/show";
import LessonShow from "@/Pages/Lessons/show";
import RequireAuth from "@/components/RequireAuth";
import { lazy, Suspense } from "react";

// Instructor pages pull in the rich-text editor + pdf.js - load on demand
// so students never download them.
const InstructorDashboard = lazy(() => import("@/Pages/Instructor"));
const CourseEditor = lazy(() => import("@/Pages/Instructor/CourseEditor"));
const CoursePreview = lazy(() => import("@/Pages/Instructor/CoursePreview"));
const InstructorSettings = lazy(() => import("@/Pages/Instructor/Settings"));

function InstructorRoute() {
  return (
    <RequireAuth role="instructor">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#DCEFD6] text-[#1F2225]">
            <p className="text-sm font-medium animate-pulse">Opening Instructor Studio...</p>
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </RequireAuth>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth role="student">
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route path="/instructor" element={<InstructorRoute />}>
        <Route index element={<InstructorDashboard />} />
        <Route path="courses/new" element={<CourseEditor />} />
        <Route path="courses/:courseId/edit" element={<CourseEditor />} />
        <Route path="courses/:courseId/preview" element={<CoursePreview />} />
        <Route path="settings" element={<InstructorSettings />} />
      </Route>
      <Route
        path="/courses"
        element={
          <RequireAuth>
            <Outlet />
          </RequireAuth>
        }
      >
        <Route index element={<Courses />} />
        <Route path=":courseId" element={<CourseShow />} />
        <Route path=":courseId/lessons/:lessonId" element={<LessonShow />} />
        {/* legacy static route */}
        <Route path="show" element={<CourseShow />} />
      </Route>
      <Route
        path="/communities"
        element={
          <RequireAuth>
            <Communities />
          </RequireAuth>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <RequireAuth>
            <Leaderboard />
          </RequireAuth>
        }
      />
      <Route
        path="/shop"
        element={
          <RequireAuth>
            <Shop />
          </RequireAuth>
        }
      />
      <Route
        path="/ai"
        element={
          <RequireAuth>
            <AI />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default App;
