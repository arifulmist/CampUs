import { Link, useNavigate } from "react-router";
import Logo from "../assets/logo-light.svg";

import placeholderDP from "../assets/images/placeholderUser.png";
import messageIcon from "../assets/icons/message_icon.svg";
import messageIconFilled from "../assets/icons/FILLEDmessage_icon.svg";
import bellIcon from "../assets/icons/bell_icon.svg";
import userIcon from "../assets/icons/user_icon.svg";
import signoutIcon from "../assets/icons/logout_icon.svg";

import { UserInfo } from "./UserInfo";
import { useEffect, useRef, useState } from "react";
import NotificationsDrawer from "./NotificationsDrawer";
import {MessageDrawer} from "@/app/pages/Messaging/MessageDrawer";
import {
  subscribe as notiSubscribe,
  getUnreadCount,
  markAllRead,
} from "../mockData/notifications";
import { supabase } from "../supabase/supabaseClient";

type UserProfileRow = {
  name: string | null;
  batch: number | null;
  department: string | null;
  student_id: string | null;
  departments_lookup?: {
    department_name: string | null;
  } | null;
};

type UserProfileExtrasRow = {
  profile_picture_url: string | null;
};

export function TopNav() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(() => getUnreadCount() > 0);
  const [isMsgOpen, setIsMsgOpen] = useState(false);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Loading...");
  const [userBatch, setUserBatch] = useState<string>("");
  const [userProfilePicUrl, setUserProfilePicUrl] = useState<string | null>(null);
  const [msgTarget, setMsgTarget] = useState<{
    id: string | null;
    name?: string;
  } | null>(null);
  const messageButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const unsub = notiSubscribe(() => {
      setHasUnreadNotifs(getUnreadCount() > 0);
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

      setAuthUid(authUid ?? null);

      if (!mounted) return;

      if (!authUid) {
        setUserName("Guest");
        setUserBatch("");
        setUserProfilePicUrl(null);
        return;
      }

      const [infoRes, profileRes] = await Promise.all([
        supabase
          .from("user_info")
          .select(
            "name,batch,department,student_id,departments_lookup(department_name)"
          )
          .eq("auth_uid", authUid)
          .maybeSingle(),
        supabase
          .from("user_profile")
          .select("profile_picture_url")
          .eq("auth_uid", authUid)
          .maybeSingle(),
      ]);

      if (!mounted) return;

      if (infoRes.error || profileRes.error) {
        console.error("Failed to load user profile:", infoRes.error || profileRes.error);
        setUserName("User");
        setUserBatch("");
        setUserProfilePicUrl(null);
        return;
      }

      const profile = infoRes.data as unknown as UserProfileRow | null;
      const profileExtras = profileRes.data as unknown as UserProfileExtrasRow | null;

      const displayName = profile?.name?.trim() || "User";
      const deptName = profile?.departments_lookup?.department_name || profile?.department || "";
      const batchValue = profile?.batch ?? null;
      const displayBatch = deptName && batchValue ? `${deptName}-${batchValue}` : "";

      setUserName(displayName);
      setUserBatch(displayBatch);
      setUserProfilePicUrl(profileExtras?.profile_picture_url ?? null);
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

  useEffect(() => {
    if (!authUid) return;

    const channel = supabase
      .channel(`topnav-user-profile-${authUid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_profile",
          filter: `auth_uid=eq.${authUid}`,
        },
        (payload) => {
          const rec = payload.new as unknown as Record<string, unknown> | null | undefined;
          const nextUrl = rec?.profile_picture_url;
          if (typeof nextUrl === "string" || nextUrl === null) {
            setUserProfilePicUrl(nextUrl);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUid]);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ authUid?: string; url?: string | null }>;
      const nextAuthUid = ce.detail?.authUid;
      if (!nextAuthUid || (authUid && nextAuthUid !== authUid)) return;
      setUserProfilePicUrl(ce.detail?.url ?? null);
    };

    window.addEventListener("campus:profilePictureUpdated", handler);
    return () => window.removeEventListener("campus:profilePictureUpdated", handler);
  }, [authUid]);

  // Listen for global message open events
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ userId: string; userName?: string }>;
      const { userId, userName } = ce.detail;
      if (userId) {
        setMsgTarget({ id: userId, name: userName });
        setIsMsgOpen(true);
      }
    };

    const clearHandler = () => {
      setMsgTarget(null);
    };

    window.addEventListener("campus:openMessage", handler);
    window.addEventListener("campus:clearMessage", clearHandler);
    return () => {
      window.removeEventListener("campus:openMessage", handler);
      window.removeEventListener("campus:clearMessage", clearHandler);
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
          {hasUnreadNotifs && (
            <span className="lg:absolute lg:-top-0.5 lg:-right-0.5 lg:inline-block lg:h-2.5 lg:w-2.5 lg:rounded-full bg-red-500 ring-2 ring-primary-lm" />
          )}
        </button>

        <button
          ref={messageButtonRef}
          className="lg:relative"
          onClick={() => {
            setIsMsgOpen((prev) => !prev);
          }}
        >
          <img
            src={isMsgOpen ? messageIconFilled : messageIcon}
            className="lg:size-6 cursor-pointer"
          />
        </button>

        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="lg:rounded-full border-[1.5px] border-accent-lm cursor-pointer"
        >
          <img
            src={userProfilePicUrl ?? placeholderDP}
            className="lg:rounded-full lg:size-8 object-cover"
            alt="Profile"
          />
        </button>

        {isOpen && (
          <UserClickModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            userName={userName}
            userBatch={userBatch}
            userImg={userProfilePicUrl ?? placeholderDP}
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
                setUserProfilePicUrl(null);
                navigate("/login", { replace: true });
              }
            }}
          />
        )}
      </div>

      <NotificationsDrawer open={isNotifOpen} onOpenChange={setIsNotifOpen} />

      <MessageDrawer 
        open={isMsgOpen}
        onOpenChange={setIsMsgOpen}
        messageButtonRef={messageButtonRef}
        initialUserId={msgTarget?.id}
        initialUserName={msgTarget?.name}
      />
    </nav>
  );
}

function UserClickModal({
  isOpen,
  onClose,
  userName,
  userBatch,
  userImg,
  onSignOut,
}: {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userBatch: string;
  userImg: string;
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
        userImg={userImg}
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
