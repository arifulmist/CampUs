import { Toaster } from "react-hot-toast";

export function RootLayout({ children }: { children?: React.ReactNode }) {
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
            boxShadow: "0 2px 8px var(--color-stroke-grey)",
          },
          success: {
            style: {
              background: "var(--color-primary-lm)",
              color: "var(colour-accent-lm)",
            },
          },
          error: {
            style: {
              background: "var(--color-danger-lm)",
              color: "var(--color-primary-lm)"
            },
          },
        }}
      />
    </>
  );
}
