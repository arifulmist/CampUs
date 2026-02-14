import crossBtn from "../../../assets/icons/cross_btn.svg";

export function ShareModal()
{
  return (
    <div className="flex flex-col lg:w-fit lg:p-10 bg-primary-lm lg:rounded-xl">
      {/* modal header */}
      <div className="flex lg:justify-between">
        <h5 className="font-header text-text-lm">Share</h5>
        <img src={crossBtn}></img>
      </div>
      {/* modal body */}
      <div>
        
      </div>
    </div>
  );
}