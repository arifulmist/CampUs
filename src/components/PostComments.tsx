import { UserInfo } from "./UserInfo";
import heartIcon from "@/assets/icons/heart_icon.svg";
import messageIcon from "@/assets/icons/message_icon.svg";
import { LucideArrowBigDown } from "lucide-react";
import { useEffect, useState } from "react";

export function PostComments()
{
  const [likeCount, setLikeCount] = useState(0);
  
  useEffect(()=>{
    setLikeCount(likeCount+1);
  },[likeCount]);

  return(
    <>
      <input className="h-full lg:mt-5 bg-primary-lm border border-stroke-grey rounded-md lg:px-4 py-2 placeholder:text-stroke-peach-lm"></input>
      {/* sort by */}
      <div className="flex gap-3">
        <p className="m-0 p-0 text-text-lm">Sort by: </p>
        <button className="outline-none text-accent-lm cursor-pointer hover:text-hover-btn-lm transition duration-150">
          Best
          <LucideArrowBigDown className="text-accent-lm"></LucideArrowBigDown>
        </button>
      </div>
      <Comment></Comment>
    </>
  );
}

function Comment()
{
  return(
    <div className="flex flex-col w-full h-full lg:p-10 bg-primary-lm">
        {/* comments */}
        <UserInfo
          userName="akal"
          userBatch="cse-2"
          postDate="just now"
        ></UserInfo>
        <p className="m-0 p-0 text-text-lm">Like this comment</p>
        {/* like and reply section */}
        <div className="flex gap-3">

          <button className="flex gap-1">
            <img src={heartIcon} className="lg:size-4"></img>
            <p className="m-0 p-0 text-accent-lm text-sm">{likeCount}</p>
          </button>

          <button className="flex gap-1">
            <img src={messageIcon} className="lg:size-4"></img>
            <p className="m-0 p-0 text-accent-lm text-sm">Reply</p>
          </button>

        </div>

      </div>
  );
}