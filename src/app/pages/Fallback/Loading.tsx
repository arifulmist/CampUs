import { Spinner } from "@/components/ui/spinner";

export function Loading()
{
  return (
  <div className="lg:px-10 lg:w-full flex items-center justify-center min-h-[calc(100vh-6rem)]">
    <div className="flex flex-col items-center gap-3">
      <Spinner className="size-12 text-accent-lm" />
      <p className="text-md text-text-lighter-lm">Loading...</p>
    </div>
  </div>
  );
}