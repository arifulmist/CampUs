import { Link, useNavigate } from "react-router";
import Logo from "../assets/logo-light.svg";

import placeholderDP from "../assets/images/placeholderUser.png";
import messageIcon from "../assets/icons/message_icon.svg";
import bellIcon from "../assets/icons/bell_icon.svg";
import userIcon from "../assets/icons/user_icon.svg";
import signoutIcon from "../assets/icons/logout_icon.svg";

import { UserInfo } from "./UserInfo";
import { useEffect, useRef, useState } from "react";
import NotificationsDrawer from "./NotificationsDrawer";
import MessageDrawer from "@/app/pages/Messaging/components/MessageDrawer";
import {
  subscribe as notiSubscribe,
  getUnreadCount,
  markAllRead,
} from "../mockData/notifications";
import { supabase } from "../../supabase/supabaseClient";

type UserProfileRow = {
  name: string | null;
  batch: number | null;
  department: string | null;
  student_id: string | null;
  departments_lookup?: {
    department_name: string | null;
  } | null;
};

export function TopNav() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(() => getUnreadCount() > 0);
  const [isMsgOpen, setIsMsgOpen] = useState(false);
  const [userName, setUserName] = useState<string>("Loading...");
  const [userBatch, setUserBatch] = useState<string>("");
  const [msgTarget, setMsgTarget] = useState<{
    id: string | null;
    name?: string;
  } | null>(null);

  useEffect(() => {
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

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const { data: userData } = await supabase.auth.getUser();
      const authUid = userData.user?.id;

      if (!mounted) return;

      if (!authUid) {
        setUserName("Guest");
        setUserBatch("");
        return;
      }

      const { data, error } = await supabase
        .from("user_info")
        .select("name,batch,department,student_id,departments_lookup(department_name)")
        .eq("auth_uid", authUid)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error("Failed to load user profile:", error);
        setUserName("User");
        setUserBatch("");
        return;
      }

      const profile = data as unknown as UserProfileRow | null;

      const displayName = profile?.name?.trim() || "User";
      const deptName = profile?.departments_lookup?.department_name || profile?.department || "";
      const batchValue = profile?.batch ?? null;
      const displayBatch = deptName && batchValue ? `${deptName}-${batchValue}` : "";

      setUserName(displayName);
      setUserBatch(displayBatch);
    }

    loadProfile();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <nav className="bg-primary-lm lg:border border-stroke-grey lg:flex lg:justify-between lg:px-10 lg:py-3">
      <Link to="/home">
        <img src={Logo} className="lg:scale-90"></img>
      </Link>
      <div className="lg:flex lg:items-center lg:gap-6">
        {/* <button>
          <img src={moonIcon} className="lg:size-6 cursor-pointer"></img>
        </button> */}

        <button onClick={() => setIsNotifOpen(true)} className="lg:relative">
          <img src={bellIcon} className="lg:size-8 cursor-pointer" />
          {hasUnread && (
            <span className="lg:absolute lg:-top-0.5 lg:-right-0.5 lg:inline-block lg:h-2.5 lg:w-2.5 lg:rounded-full bg-red-500 ring-2 ring-primary-lm" />
          )}
        </button>

        <button
          onClick={() => {
            // Always open inbox list first
            setMsgTarget({ id: null });
            setIsMsgOpen(true);
          }}
        >
          <img src={messageIcon} className="lg:size-6 cursor-pointer" />
        </button>

        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="lg:rounded-full border-[1.5px] border-accent-lm cursor-pointer"
        >
          <img src={placeholderDP} className="lg:rounded-full lg:size-8" />
        </button>

        {isOpen && (
          <UserClickModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            userName={userName}
            userBatch={userBatch}
            onSignOut={async () => {
              try {
                await supabase.auth.signOut();
              } finally {
                localStorage.removeItem("user");
                localStorage.removeItem("isAuthenticated");
                localStorage.removeItem("studentId");
                setIsOpen(false);
                setIsNotifOpen(false);
                setIsMsgOpen(false);
                navigate("/login", { replace: true });
              }
            }}
          />
        )}
      </div>
      <NotificationsDrawer open={isNotifOpen} onOpenChange={setIsNotifOpen} />
      {isMsgOpen && (
        <MessageDrawer
          open={isMsgOpen}
          onOpenChange={setIsMsgOpen}
          userId={msgTarget?.id ?? undefined}
          userName={msgTarget?.name || ""}
          avatarSrc={undefined}
        />
      )}
    </nav>
  );
}

function UserClickModal({
  isOpen,
  onClose,
  userName,
  userBatch,
  onSignOut,
}: {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userBatch: string;
  onSignOut: () => void | Promise<void>;
}) {
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
      <hr className="lg:mt-2 border-stroke-grey"></hr>
      <ModalButtons
        icon={userIcon}
        label="Profile"
        linkto={"/profile"}
      ></ModalButtons>
      <hr className="border-stroke-grey"></hr>
      <ModalButtons
        icon={signoutIcon}
        label="Sign Out"
        onClick={onSignOut}
      ></ModalButtons>
    </div>
  );
}

function ModalButtons({
  icon,
  label,
  linkto,
  onClick,
}: {
  icon: string;
  label: string;
  linkto?: string;
  onClick?: () => void | Promise<void>;
}) {
  const btn = (
    <button
      type="button"
      onClick={onClick}
      className="lg:flex lg:items-center lg:gap-2 lg:w-full lg:my-1 lg:px-2 lg:py-2 hover:bg-hover-lm hover:rounded-lg"
    >
      <img src={icon}></img>
      <p className="text-accent-lm">{label}</p>
    </button>
  );

  return linkto ? <Link to={linkto}>{btn}</Link> : btn;
}
