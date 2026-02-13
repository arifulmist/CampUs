import placeholderimg from "@/assets/images/placeholderPostImg.png";

export function MessageDrawer()
{
  return(
    <div className="lg:h-full bg-primary-lm lg:w-[25vw] lg:px-4 lg:py-5 fixed top-30 right-0 bottom-0 border border-stroke-grey lg:rounded-md lg:rounded-b-none">
      <div>
        <h5 className="text-accent-lm font-header font-semibold">Messages</h5>
        <hr className="border-accent-lm lg:mt-3 lg:mb-1"></hr>
      </div>

      {/* Chat List */}
      <div>
        <MessageChannel 
        userName="Abcd Efgh"
        userAvatar={placeholderimg}
        messagePreview="jshdjakh jahda sjdha s..."
        isUnread={true}
        />
      </div>
      <hr className="border-stroke-grey lg:my-1"></hr>
    </div>
  );
}

import type {chatUser} from "./components/ChatHistory";

 interface ListMessages extends chatUser {
  messagePreview: string,
  isUnread: boolean
}

function MessageChannel({userName, userAvatar, messagePreview, isUnread} : ListMessages)
{
  return(
    <div className="flex items-center w-full justify-between lg:px-2 lg:py-4 lg:rounded-lg hover:bg-hover-lm transition duration-150">
      <div className="flex items-center gap-4">
        <div className="size-10">
          <img src={userAvatar} className="object-cover rounded-full"></img>
        </div>

        <div className="flex flex-col">
          <p className={`lg:m-0 font-medium ${isUnread ? `text-accent-lm`:`text-text-lm`}`}>{userName}</p>
          <p className={`lg:m-0 text-sm ${isUnread ? `text-text-lm text-md`:`text-text-lighter-lm/60`}`}>{messagePreview}</p>
        </div>
      </div>
      {isUnread && 
        <span className="size-2 bg-accent-lm rounded-full animate-pulse"></span>
      }
    </div>
  );
}