import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { router } from "./app/routes";
import { RouterProvider } from "react-router-dom";
import { RootLayout } from "./app/toaster";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootLayout>
      <RouterProvider router={router} />
    </RootLayout>
  </StrictMode>
);
