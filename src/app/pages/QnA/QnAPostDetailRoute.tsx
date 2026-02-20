import { useParams } from "react-router-dom";

import { PostComments } from "@/components/PostComments";
import { QnAPostRoute } from "./components/QnAPostRoute";

export function QnAPostDetailRoute() {
  const { postId } = useParams();

  if (!postId) {
    return (
      <div className="lg:flex lg:flex-col lg:gap-6 lg:h-full lg:w-full lg:p-10 lg:animate-fade-in">
        <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl lg:p-10 flex flex-col gap-6 w-full">
          <p className="text-text-lighter-lm">Invalid QnA post.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:flex lg:flex-col lg:h-full lg:w-full lg:p-10 lg:animate-fade-in">
      <QnAPostRoute postId={postId} />
      <PostComments postId={postId} />
    </div>
  );
}

export default QnAPostDetailRoute;
