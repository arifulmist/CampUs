import { createBrowserRouter, Navigate } from "react-router-dom";

import { Layout } from "./Layout";

import { Signup } from "./pages/Registration/Signup";
import { SignupOCR } from "./pages/Registration/SignupOCR";
import { Login } from "./pages/Registration/Login";
import { Login2FA } from "./pages/Registration/Login2FA";
import { Home } from "./pages/Home/Home";
import { CollabHub } from "./pages/CollabHub/CollabHub";
import { CollabPostDetailRoute } from "./pages/CollabHub/CollabPostDetailRoute";
import { Events } from "./pages/Events/Events";
import { EventPostDetailRoute } from "./pages/Events/EventPostDetailRoute";
import { QnA } from "./pages/QnA/QnA";
import { QnAPostDetailRoute } from "./pages/QnA/QnAPostDetailRoute";
import { Notes } from "./pages/Study/components/Notes";
import { StudyLayout } from "./pages/Study/StudyLayout";
import { Resources } from "./pages/Study/components/Resources";
import { LostFound } from "./pages/LostAndFound/LostFound";
import { LostFoundDetailRoute } from "./pages/LostAndFound/LostFoundDetailRoute";
import { UserProfile } from "./pages/UserProfile/UserProfile";
import { NotFound } from "./pages/Fallback/Error_NotFound";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/signup" replace /> },
  { path: "/signup", element: <Signup /> },
  { path: "/signup/ocr", element: <SignupOCR /> },
  {
    path: "/login",
    element: <Login />,
    errorElement: <NotFound />, // handle login errors
  },
  {
    path: "/login/2fa/:userId", //should not be able to access without going through login first!!
    element: <Login2FA />,
    errorElement: <NotFound />,
  },

  /* ---------- APP ROUTES (WITH LAYOUT) ---------- */
  {
    element: <Layout />,
    errorElement: <NotFound />,
    children: [
      { path: "/home", element: <Home />},
      { path: "/collab", element: <CollabHub /> },
      { path: "/collab/:postId", element: <CollabPostDetailRoute /> },
      { path: "/events", element: <Events /> },
      { path: "/events/:postId", element: <EventPostDetailRoute /> },
      { path: "/qna", element: <QnA /> },
      { path: "/qna/:postId", element: <QnAPostDetailRoute /> },
      {
        path: "/study/:level/:term",
        element: <StudyLayout />,
        children: [
          { index: true, element: <Navigate to="notes" replace /> },
          { path: "notes", element: <Notes /> },
          { path: "resources", element: <Resources /> },
          { path: "*", element: <NotFound /> }
        ],
      },
      { path: "/lost-and-found", element: <LostFound /> },
      { path: "/lost-and-found/:post_id", element: <LostFoundDetailRoute /> },
      { path: "/profile", element: <UserProfile /> },
      { path: "/profile/:studentId", element: <UserProfile /> },
      { path: "*", element: <NotFound /> }
    ],
  },
]);
