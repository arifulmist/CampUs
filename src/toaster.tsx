import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { router } from "./app/routes.tsx";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";   

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* RouterProvider renders all your routes */}
    <RouterProvider router={router} />
    <Toaster 
      position="top-center" 
      reverseOrder={false} 
      toastOptions={{
        style: {
          fontFamily: "Figtree, sans-serif",
          fontSize: "var(--text-base)",
          borderRadius: "8px",
          padding: "12px 16px",
        },
        success: {
          style: {
            background: "var(--color-message-user-lm)",
            color: "white",
          },
        },
        error: {
          style: {
            background: "var(--color-stroke-peach)",
            color: "black",
          },
        },
      }}
    />
  </StrictMode>,
)
