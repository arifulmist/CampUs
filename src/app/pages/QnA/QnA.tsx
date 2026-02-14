import { Suspense } from "react";
import QAPageContent from "./QnAPageContent/QAPageContent";

export function QnA() {
  return (
    <Suspense fallback={null}>
      <QAPageContent />
    </Suspense>
  );
}
