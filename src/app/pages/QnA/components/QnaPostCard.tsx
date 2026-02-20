import { CommentButton, LikeButton, ShareButton } from "@/components/PostButtons";
import { UserInfo } from "@/components/UserInfo";

export type QnaFeedPost = {
  id: string;
  title: string;
  author: string;
  authorAvatar?: string | null;
  authorAuthUid?: string;
  authorCourse: string;
  content: string;
  category: "Question" | "Advice" | "Resource";
  tags: string[];
  reactions: number;
  comments: number;
  shares: number;
  timestamp: string;
  imageUrl?: string | null;
};

type PostDetail = {
  postId: string;
  postTag: "Question" | "Advice" | "Resource";
  postTitle: string;
  postPreview: string;
  attachmentUrl?: string | null;
  authorName: string;
  authorBatch: string;
  authorId?: string | null;
  postDate?: string;
  initialLikeCount?: number;
  initialCommentCount?: number;
};

export function QnAPostCard({
  postId,
  postTag,
  postTitle,
  postPreview,
  attachmentUrl,
  authorName,
  authorBatch,
  authorId,
  postDate,
  initialLikeCount,
  initialCommentCount,
}: PostDetail)
{
  return(
    <div className="flex flex-col lg:gap-4 bg-secondary-lm border border-stroke-grey hover:bg-hover-lm hover:border-stroke-peach transition lg:rounded-xl lg:p-8 group">
      {/* <div className="flex lg:gap-6 justify-between items-start"> */}
        <div className="flex flex-col lg:gap-4 min-w-0 flex-1">
          <p className="w-fit lg:px-2.5 lg:py-0.5 bg-hover-lm text-accent-lm text-sm border border-stroke-peach rounded-xl group-hover:bg-primary-lm group-hover:transition">{postTag}</p>
          <p className="font-header font-medium text-xl text-text-lm wrap-break-word">{postTitle}</p>
          <div className="flex justify-between lg:gap-2">
            <div className="lg:space-y-4">
              <UserInfo 
                userName={authorName}
                userBatch={authorBatch}
                userId={authorId ?? undefined}
                postDate={postDate}
              />
              <p className="text-text-lm wrap-break-word">{postPreview}</p>
            </div>
            
            {attachmentUrl ? (
            <div className="size-25 rounded-xl overflow-hidden border border-stroke-grey shrink-0 bg-primary-lm">
              <img src={attachmentUrl} alt="Post attachment" className="w-full h-full object-cover" />
            </div>
          ) : null}
          </div>
        </div>

      <div className="lg:flex lg:gap-3 lg:justify-start lg:mt-2">
        <LikeButton postId={postId} initialLikeCount={initialLikeCount} />
        <CommentButton postId={postId} initialCommentCount={initialCommentCount} navigateTo={`/qna/${postId}`} />
        <ShareButton></ShareButton>
      </div>
    </div>
  );
}

// Backwards-compatible export used by the User Profile feed.
export function QnaPostCard({
  post,
  onOpenDetail,
}: {
  post: QnaFeedPost;
  onOpenDetail: () => void;
  onLike: () => void;
  onAddInlineComment: (text: string) => void;
}) {
  return (
    <div role="button" tabIndex={0} onClick={onOpenDetail} className="cursor-pointer">
      <QnAPostCard
        postId={post.id}
        postTag={post.category}
        postTitle={post.title}
        postPreview={post.content}
        attachmentUrl={post.imageUrl ?? null}
        authorName={post.author}
        authorBatch={post.authorCourse}
        authorId={post.authorAuthUid ?? null}
        postDate={post.timestamp}
        initialLikeCount={post.reactions}
        initialCommentCount={post.comments}
      />
    </div>
  );
}