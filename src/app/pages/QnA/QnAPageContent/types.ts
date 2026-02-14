export type Post = {
  id: string;
  title: string;
  author: string;
  authorAvatar: string;
  authorCourse: string;
  content: string;
  category: "Question" | "Advice" | "Resource";
  tags: string[];
  reactions: number;
  comments: number;
  shares: number;
  timestamp: string;
};


export type PostCategory = "Question" | "Advice" | "Resource";

export const categoryStyles: Record<PostCategory, string> = {
  Question: "bg-[#75ea92]",
  Advice: "bg-[#71bdff]",
  Resource: "bg-[#e98181]",
};
