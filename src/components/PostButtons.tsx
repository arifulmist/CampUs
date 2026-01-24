import { useState, type MouseEventHandler } from "react"

import heartIcon from "@/assets/icons/heart_icon.svg";
import filledHeartIcon from "@/assets/icons/FILLEDheart_icon.svg";
import commentIcon from "@/assets/icons/comment_icon.svg";
import shareIcon from "@/assets/icons/share_icon.svg";

// import { ShareModal } from "./ShareModal";


interface ButtonProps
{
  icon: string,
  label: string | number,
  clickEvent?: MouseEventHandler<HTMLButtonElement>
}

function ButtonBase({icon, label, clickEvent}:ButtonProps)
{
  return (
    <button onClick={clickEvent} className="lg:flex lg:gap-2 lg:px-4 lg:py-2 lg:font-bold text-accent-lm bg-primary-lm hover:bg-accent-lm/10 transition duration-200 border-2 border-stroke-peach lg:rounded-full cursor-pointer">
      <img src={icon}></img>
      {label}
    </button>
  );
}

export function LikeButton()
{
  const [likeState, setLikeState]=useState({isLiked:false, likeCount:0})
  
  function handleLikeState()
  {
    setLikeState(prev => ({
      isLiked: !prev.isLiked,
      likeCount: prev.isLiked? prev.likeCount-1 : prev.likeCount+1
    }))
  }

  return (
    <ButtonBase 
      icon={
        likeState.isLiked? 
        filledHeartIcon : heartIcon} 
      label={
        (likeState.likeCount===0)? "Like": likeState.likeCount}
      clickEvent={handleLikeState}
    ></ButtonBase>
  );
}

export function CommentButton()
{
  const [commentCount, setCommentCount]=useState(0);
  //need to handle comment count updating if new comment is added in the post's dedicated link and wherever the post shows up

  return (
    <ButtonBase icon={commentIcon} label={(commentCount===0)? "Comment": commentCount}></ButtonBase>
  );
}

export function ShareButton()
{
  // const [isClicked, setIsClicked]=useState(false);

  return (
    <>
      <ButtonBase icon={shareIcon} label={"Share"}></ButtonBase>
      {/* {isClicked && <ShareModal/>} */}
    </>
  );
}