import { LucideArrowLeft, LucidePaperclip, LucideSendHorizontal } from "lucide-react";

export interface chatUser{
  userName: string,
  userAvatar: string,
  userBatch?: string,
  onlineStatus?:boolean 
}

export function ChatHistory({userName, userAvatar, userBatch, onlineStatus}: chatUser)
{
  return(
    <div className="lg:h-full lg:my-3 border border-stroke-grey lg:rounded-lg">
      {/* chat header */}
      <div className="bg-primary-lm border-b border-b-stroke-grey lg:p-2">
        
        {/* holds user details & online status */}
        <div className="flex justify-between items-center">
          
          {/* user details */}
          <div className="flex items-center lg:gap-2">
            <LucideArrowLeft className="text-accent-lm"/>
            <div className="lg:size-10"><img src={userAvatar} className="rounded-full object-cover ring ring-stroke-grey"/></div>
            <div className="flex flex-col">
              <p className="m-0 p-0 text-accent-lm font-semibold">{userName}</p>
              <p className="m-0 p-0 text-text-lm font-semibold text-sm">{userBatch}</p>
            </div>
          </div>

          {/* online status */}
          <div className="flex items-center">
            <span className="lg:size-4 bg-online-indicator rounded-full"></span>
            { onlineStatus?
              <p className="m-0 p-0 text-online-indicator text-sm">Online</p>
              :
              <p className="m-0 p-0 text-stroke-grey text-sm">Offline</p>
            }
          </div>

        </div>
      </div>

      {/* chat body */}
      <div className="bg-secondary-lm">
        <ChatMessage 
        userAvatar={userAvatar}
        message="jhdakjhdkajhda"
        ></ChatMessage>
      </div>

      {/* send message */}
      <div className="bg-primary-lm border-t border-t-stroke-grey flex lg:gap-2 items-center lg:px-2">
        <button type="button">
          <LucidePaperclip className="text-accent-lm lg:size-10"/>
        </button>
        <input type="text" placeholder="Type here..." className="bg-secondary-lm border border-stroke-grey lg:rounded-md text-text-lm lg:px-2 lg:py-3 placeholder:text-text-lighter-lm/60"></input>
        <button type="submit">
          <LucideSendHorizontal className="text-accent-lm lg:size-10"/>
        </button>
      </div>

    </div>
  );
}


function ChatMessage({userAvatar, message}:{userAvatar:string, message:string})
{
  return(
    <div className="flex lg:gap-1 items-end">
      <div className="lg:size-8">
        <img src={userAvatar} className="rounded-full ring ring-stroke-grey object-cover"></img>
      </div>
      <div className="bg-message-other-lm w-fit h-fit lg:p-2">
        <p className="text-text-lm">{message}</p>
      </div>
    </div>
  );
}