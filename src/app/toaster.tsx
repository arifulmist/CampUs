// app/toaster.tsx
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import toast from "react-hot-toast";

export function RootLayout({ children }: { children?: React.ReactNode }) {
  useEffect(() => {
    toast.success("App loaded successfully!");
  }, []);

  return (
    <>
      {children}
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            fontFamily: "Figtree, sans-serif",
            fontSize: "var(--text-base)",
            borderRadius: "8px",
            padding: "12px 16px",
            color: "var(--color-text-lm)",
            background: "var(--color-background-lm)",
            boxShadow: "0 4px 12px var(--color-shadow-peach)",
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
    </>
  );
}
