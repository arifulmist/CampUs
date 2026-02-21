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
            margin: "4px"
          },
          success: {
            style: {
              background: "oklch(60.821% 0.18774 145.657)",
              color: "var(--color-primary-lm)",
            },
          },
          error: {
            style: {
              background: "oklch(41.233% 0.16921 29.223)",
              color: "var(--color-primary-lm)"
            },
          },
        }}
      />
    </>
  );
}
