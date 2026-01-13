import { createBrowserRouter, Navigate } from "react-router";

import { Layout } from "./Layout";

import { Signup } from "./pages/Registration/Signup";
import { SignupOCR } from "./pages/Registration/SignupOCR";
import { Login } from "./pages/Registration/Login";
import { Login2FA } from "./pages/Registration/Login2FA";
import { Home } from "./pages/Home/Home";
import { CollabHub } from "./pages/CollabHub/CollabHub";
import { Events } from "./pages/Events/Events";
import { QnA } from "./pages/QnA/QnA";
import { Notes } from "./pages/Study/components/Notes";
import { StudyLayout } from "./pages/Study/StudyLayout";
import { Resources } from "./pages/Study/components/Resources";
import { LostFound } from "./pages/LostAndFound/LostFound";
import { UserProfile } from "./pages/UserProfile/UserProfile";
import { NotFound } from "./pages/Error_NotFound";
import { Messaging } from "./pages/Messaging/Messaging";

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
      { path: "/events", element: <Events /> },
      { path: "/qna", element: <QnA /> },
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
      { path: "/profile", element: <UserProfile /> },
      { path: "/profile/:userId", element: <UserProfile /> },
      { path: "/messages", element: <Messaging /> },
      { path: "*", element: <NotFound /> }
    ],
  },
]);
