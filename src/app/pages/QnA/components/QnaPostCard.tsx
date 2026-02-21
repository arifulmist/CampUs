import { CommentButton, LikeButton, ShareButton } from "@/components/PostButtons";
import { UserInfo } from "@/components/UserInfo";
import moreImages from "@/assets/images/more_images.png";

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
  attachmentUrls?: string[];
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
  attachmentUrls,
  authorName,
  authorBatch,
  authorId,
  postDate,
  initialLikeCount,
  initialCommentCount,
}: PostDetail)
{
  const urls = Array.isArray(attachmentUrls) && attachmentUrls.length
    ? attachmentUrls
    : (attachmentUrl ? [attachmentUrl] : []);

  const showMoreTile = urls.length > 1;
  const remaining = Math.max(0, urls.length - 1);

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

            {urls.length > 0 ? (
              <div className="flex gap-2 shrink-0">
                <div className="size-25 rounded-xl overflow-hidden border border-stroke-grey bg-primary-lm">
                  <img src={urls[0]} alt="Post attachment" className="w-full h-full object-cover" />
                </div>

                {showMoreTile ? (
                  <div className="relative size-25 rounded-xl overflow-hidden border border-stroke-grey bg-primary-lm">
                    <img src={moreImages} alt="More images" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-primary-lm font-semibold text-lg">+{remaining}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

      <div className="lg:flex lg:gap-3 lg:justify-start lg:mt-2">
        <LikeButton postId={postId} initialLikeCount={initialLikeCount} />
        <CommentButton postId={postId} initialCommentCount={initialCommentCount} navigateTo={`/qna/${postId}`} />
        <ShareButton postId={postId} categorySet={"qna"}></ShareButton>
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