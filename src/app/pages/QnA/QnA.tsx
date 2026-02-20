import { Suspense } from "react";
import {QAPageContent} from "./components/QAPageContent";
import { Loading } from "../Fallback/Loading";

export function QnA() {
  return (
    <Suspense fallback={<Loading/>}>
      <QAPageContent />
    </Suspense>
  );
}
