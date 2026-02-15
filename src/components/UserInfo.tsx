import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";
import placeholderUserImg from "@/assets/images/placeholderUser.png";

const avatarCacheByAuthUid = new Map<string, string | null>();
const avatarFetchInFlight = new Map<string, Promise<string | null>>();
const studentIdCacheByAuthUid = new Map<string, string | null>();
const studentIdFetchInFlight = new Map<string, Promise<string | null>>();

interface UserDetails {
  userImg?: string | null;
  userName: string;
  userBatch: string;
  userId?: string;
  studentId?: string;
  disableClick?: boolean;
  postDate?: string | undefined;
}

export function UserInfo({
  userImg,
  userName,
  userBatch,
  userId,
  studentId,
  disableClick,
  postDate,
}: UserDetails) {
  const navigate = useNavigate();
  const [resolvedAvatar, setResolvedAvatar] = useState<{ authUid: string; url: string | null } | null>(null);

  const cachedAvatar = userId ? avatarCacheByAuthUid.get(userId) : undefined;
  const resolvedForThisUser =
    userId && resolvedAvatar?.authUid === userId ? resolvedAvatar.url : null;

  // Prefer DB-resolved avatar when available.
  const avatarFromDb = cachedAvatar !== undefined ? cachedAvatar : resolvedForThisUser;
  const avatarSrc = avatarFromDb ?? userImg ?? placeholderUserImg;

  useEffect(() => {
    let mounted = true;

    if (!userId) return () => {
      mounted = false;
    };

    const cached = avatarCacheByAuthUid.get(userId);
    if (cached !== undefined) return () => {
      mounted = false;
    };

    const existing = avatarFetchInFlight.get(userId);
    const promise =
      existing ??
      (async () => {
        const { data, error } = await supabase
          .from("user_profile")
          .select("profile_picture_url")
          .eq("auth_uid", userId)
          .maybeSingle();
        if (error) throw error;
        const url = (data as unknown as { profile_picture_url?: unknown } | null)?.profile_picture_url;
        return typeof url === "string" && url.trim() ? url : null;
      })();

    if (!existing) avatarFetchInFlight.set(userId, promise);

    promise
      .then((url) => {
        avatarCacheByAuthUid.set(userId, url);
        avatarFetchInFlight.delete(userId);
        if (mounted) setResolvedAvatar({ authUid: userId, url });
      })
      .catch((e) => {
        avatarCacheByAuthUid.set(userId, null);
        avatarFetchInFlight.delete(userId);
        if (mounted) setResolvedAvatar({ authUid: userId, url: null });
        console.error("Failed to load avatar for user:", e);
      });

    return () => {
      mounted = false;
    };
  }, [userId]);

  async function resolveStudentIdFromAuthUid(authUid: string): Promise<string | null> {
    const cached = studentIdCacheByAuthUid.get(authUid);
    if (cached !== undefined) return cached;

    const existing = studentIdFetchInFlight.get(authUid);
    const promise =
      existing ??
      (async () => {
        const { data, error } = await supabase
          .from("user_info")
          .select("student_id")
          .eq("auth_uid", authUid)
          .maybeSingle();
        if (error) throw error;
        const sid = (data as unknown as { student_id?: unknown } | null)?.student_id;
        return typeof sid === "string" && sid.trim() ? sid : null;
      })();

    if (!existing) studentIdFetchInFlight.set(authUid, promise);

    try {
      const sid = await promise;
      studentIdCacheByAuthUid.set(authUid, sid);
      studentIdFetchInFlight.delete(authUid);
      return sid;
    } catch (e) {
      studentIdCacheByAuthUid.set(authUid, null);
      studentIdFetchInFlight.delete(authUid);
      console.error("Failed to resolve student_id for user:", e);
      return null;
    }
  }

  async function handleNavigateToProfile() {
    if (disableClick) return;

    if (studentId && studentId.trim()) {
      navigate(`/profile/${studentId}`);
      return;
    }

    if (userId && userId.trim()) {
      const sid = await resolveStudentIdFromAuthUid(userId);
      if (sid) {
        navigate(`/profile/${sid}`);
        return;
      }
    }

    navigate("/profile");
  }

  return (
    <div className="lg:w-fit">
      {disableClick ? (
        <div className="lg:flex lg:gap-2 lg:pointer-events-none">
          <div className="lg:user-img">
            <img
              src={avatarSrc}
              alt={`${userName} avatar`}
              className="lg:rounded-full lg:w-9 lg:h-9 w-9 h-9 object-cover border-[1.5px] border-accent-lm"
            />
          </div>
          <div className="lg:flex lg:flex-col">
            <p className="text-base text-accent-lm lg:font-[Poppins] lg:font-medium">
              {userName}
            </p>
            <p className="text-sm text-accent-lm lg:font-[Poppins] lg:font-normal">
              {userBatch}
              {postDate ? ` • ${postDate}` : ""}
            </p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void handleNavigateToProfile()}
          className="lg:flex lg:gap-2 cursor-pointer text-left"
        >
          <div className="lg:user-img">
            <img
              src={avatarSrc}
              alt={`${userName} avatar`}
              className="lg:rounded-full lg:w-9 lg:h-9 w-9 h-9 object-cover border-[1.5px] border-accent-lm"
            />
          </div>
          <div className="lg:flex lg:flex-col">
            <p className="text-base text-accent-lm lg:font-[Poppins] lg:font-medium">
              {userName}
            </p>
            <p className="text-sm text-accent-lm lg:font-[Poppins] lg:font-normal">
              {userBatch}
              {postDate ? ` • ${postDate}` : ""}
            </p>
          </div>
        </button>
      )}
    </div>
  );
}
