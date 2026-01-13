import { Link } from "react-router";
import Logo from "../assets/logo-light.svg";

import placeholderDP from "../assets/images/placeholderUser.png";
import messageIcon from "../assets/icons/message_icon.svg";
import bellIcon from "../assets/icons/bell_icon.svg";
import moonIcon from "../assets/icons/moon_icon.svg";
import userIcon from "../assets/icons/user_icon.svg";
import signoutIcon from "../assets/icons/logout_icon.svg";

import { UserInfo } from "./UserInfo";
import { useEffect, useRef, useState } from "react";
import NotificationsDrawer from "./NotificationsDrawer";
import MessageDrawer from "@/app/pages/Messaging/components/MessageDrawer";
import {
  getActiveUserId,
  getThreads,
} from "@/app/pages/Messaging/backend/chatStore";
import {
  subscribe as notiSubscribe,
  getUnreadCount,
  markAllRead,
} from "../lib/notifications";

//Arbitrary placeholder values till db is connected
const userName: string = "Alvi Binte Zamil";
const userBatch: string = "CSE-23";

export function TopNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [isMsgOpen, setIsMsgOpen] = useState(false);
  const [msgTarget, setMsgTarget] = useState<{
    id: string | null;
    name?: string;
  } | null>(null);

  useEffect(() => {
    // initialize badge and subscribe to changes
    setHasUnread(getUnreadCount() > 0);
    const unsub = notiSubscribe(() => {
      setHasUnread(getUnreadCount() > 0);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isNotifOpen) {
      // mark as read when drawer opens
      markAllRead();
    }
  }, [isNotifOpen]);

  return (
    <nav className="bg-primary-lm border border-stroke-grey flex justify-between px-10 py-3">
      <Link to="/home">
        <img src={Logo} className="scale-90"></img>
      </Link>
      <div className="flex items-center gap-6">
        {/* <button>
          <img src={moonIcon} className="size-6 cursor-pointer"></img>
        </button> */}

        <button onClick={() => setIsNotifOpen(true)} className="relative">
          <img src={bellIcon} className="size-8 cursor-pointer" />
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 inline-block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-primary-lm" />
          )}
        </button>

        <button
          onClick={() => {
            // Always open inbox list first
            setMsgTarget({ id: null });
            setIsMsgOpen(true);
          }}
        >
          <img src={messageIcon} className="size-6 cursor-pointer" />
        </button>

        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="rounded-full border-[1.5px] border-accent-lm cursor-pointer"
        >
          <img src={placeholderDP} className="rounded-full size-8" />
        </button>

        {isOpen && <UserClickModal isOpen={isOpen} onClose={()=>setIsOpen(false)}></UserClickModal>}
      </div>
      <NotificationsDrawer open={isNotifOpen} onOpenChange={setIsNotifOpen} />
      {isMsgOpen && (
        <MessageDrawer
          open={isMsgOpen}
          onOpenChange={setIsMsgOpen}
          userId={msgTarget?.id || (undefined as any)}
          userName={msgTarget?.name || ""}
          avatarSrc={undefined}
        />
      )}
    </nav>
  );
}

function UserClickModal({ isOpen, onClose }: { isOpen: boolean, onClose: ()=>void }) {
    const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={modalRef}
      className={`bg-primary-lm w-60 px-2 py-3.5 rounded-xl absolute top-12.5 right-8 border border-stroke-grey ${
        isOpen ? "animate-slide-in" : "animate-slide-out"
      }`}
    >
      <UserInfo
        userImg={placeholderDP}
        userName={userName}
        userBatch={userBatch}
        disableClick={true}
      ></UserInfo>
      <hr className="mt-2 border-stroke-grey"></hr>
      <ModalButtons
        icon={userIcon}
        label="Profile"
        linkto={"/profile"}
      ></ModalButtons>
      <hr className="border-stroke-grey"></hr>
      <ModalButtons
        icon={signoutIcon}
        label="Sign Out"
        linkto={"/login"}
      ></ModalButtons>
    </div>
  );
}

function ModalButtons({
  icon,
  label,
  linkto,
}: {
  icon: string;
  label: string;
  linkto: string;
}) {
  return (
    <Link to={linkto}>
      <button className="flex items-center gap-2 w-full my-1 px-2 py-2 hover:bg-hover-lm hover:rounded-lg">
        <img src={icon}></img>
        <p className="text-accent-lm">{label}</p>
      </button>
    </Link>
  );
}
