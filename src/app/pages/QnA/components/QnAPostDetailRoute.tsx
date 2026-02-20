import { useState } from "react";
import { useParams } from "react-router-dom";

import { PostComments } from "@/components/PostComments";
import { QnAPostRoute } from "./QnAPostRoute";
import { Loading } from "../../Fallback/Loading";

function QnAPostDetailInner({ postId }: { postId: string }) {
  const [postReady, setPostReady] = useState(false);
  const [commentsReady, setCommentsReady] = useState(false);
  const isReady = postReady && commentsReady;

  return (
    <div className="lg:flex lg:flex-col lg:h-full lg:w-full lg:p-10 lg:animate-fade-in">
      {!isReady ? <Loading /> : null}

      <div className={!isReady ? "hidden" : ""}>
        <QnAPostRoute postId={postId} onInitialLoadDone={() => setPostReady(true)} />
        <PostComments postId={postId} onInitialLoadDone={() => setCommentsReady(true)} />
      </div>
    </div>
  );
}

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

  return <QnAPostDetailInner key={postId} postId={postId} />;
}

export default QnAPostDetailRoute;
