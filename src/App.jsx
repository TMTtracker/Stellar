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

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
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
