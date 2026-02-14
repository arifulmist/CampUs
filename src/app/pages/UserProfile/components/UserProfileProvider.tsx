import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { SkillsLookupItem } from "./AddLookupItemModal";
import type {
  ContactPlatformRow,
  UserContactItem,
  UserInfoRow,
  UserPostItem,
  UserProfileRow,
} from "../profile-types";

import { supabase } from "../../../../supabase/supabaseClient";
import { UserProfileContextProvider } from "./UserProfileContext";
import { formatBatchLabel, getErrorMessage } from "../userProfileUtils";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { studentId: routeStudentId } = useParams();

  const [profileLoading, setProfileLoading] = useState(true);
  const currentAuthUidRef = useRef<string | null>(null);

  const [skillsLookup, setSkillsLookup] = useState<SkillsLookupItem[]>([]);
  const [skillsLookupLoading, setSkillsLookupLoading] = useState(false);
  const [skillsLookupError, setSkillsLookupError] = useState<string>("");

  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  const [contactPlatforms, setContactPlatforms] = useState<ContactPlatformRow[]>([]);
  const [contactPlatformsLoading, setContactPlatformsLoading] = useState(false);
  const [contactPlatformsError, setContactPlatformsError] = useState<string>("");

  const [contacts, setContacts] = useState<UserContactItem[]>([]);

  const [userPosts, setUserPosts] = useState<UserPostItem[]>([]);
  const [userPostsLoading, setUserPostsLoading] = useState(false);
  const [userPostsError, setUserPostsError] = useState<string>("");

  const [displayName, setDisplayName] = useState<string>("Loading...");
  const [studentId, setStudentId] = useState<string>("");
  const [batchLabel, setBatchLabel] = useState<string>("");

  const [currentAuthUid, setCurrentAuthUid] = useState<string | null>(null);
  const [viewedAuthUid, setViewedAuthUid] = useState<string | null>(null);

  const [bio, setBio] = useState<string>("");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [backgroundImgUrl, setBackgroundImgUrl] = useState<string | null>(null);

  const canEdit = !!currentAuthUid && !!viewedAuthUid && currentAuthUid === viewedAuthUid;

  useEffect(() => {
    let mounted = true;

    async function loadUserInfo() {
      setProfileLoading(true);
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        const authUid = userData.user?.id;

        setCurrentAuthUid(authUid ?? null);
        currentAuthUidRef.current = authUid ?? null;

        if (!mounted) return;

        if (!authUid) {
          setDisplayName("Guest");
          setStudentId("");
          setBatchLabel("");
          setBio("");
          setProfilePictureUrl(null);
          setBackgroundImgUrl(null);
          setSkills([]);
          setInterests([]);
          setUserPosts([]);
          setUserPostsError("");
          setContacts([]);
          setViewedAuthUid(null);
          return;
        }

        let targetAuthUid = authUid;
        if (routeStudentId) {
          const routeValue = routeStudentId.trim();

          const { data: byStudent } = await supabase
            .from("user_info")
            .select("auth_uid")
            .eq("student_id", routeValue)
            .maybeSingle();

          let resolvedAuthUid = (byStudent as unknown as { auth_uid?: unknown } | null)?.auth_uid;

          if (!resolvedAuthUid && isUuid(routeValue)) {
            const { data: byAuth } = await supabase
              .from("user_info")
              .select("auth_uid")
              .eq("auth_uid", routeValue)
              .maybeSingle();
            resolvedAuthUid = (byAuth as unknown as { auth_uid?: unknown } | null)?.auth_uid;
          }

          if (typeof resolvedAuthUid === "string" && resolvedAuthUid) {
            targetAuthUid = resolvedAuthUid;
            if (targetAuthUid === authUid) {
              navigate("/profile", { replace: true });
            }
          } else {
            setViewedAuthUid(null);
            setDisplayName("User not found");
            setStudentId(routeValue);
            setBatchLabel("");
            setBio("");
            setProfilePictureUrl(null);
            setBackgroundImgUrl(null);
            setSkills([]);
            setInterests([]);
            setUserPosts([]);
            setUserPostsError("");
            setContacts([]);
            return;
          }
        }

        // Clear previous profile state immediately so we don't briefly show stale data
        // while the next profile is loading.
        setDisplayName("Loading...");
        setStudentId("");
        setBatchLabel("");
        setBio("");
        setProfilePictureUrl(null);
        setBackgroundImgUrl(null);
        setSkills([]);
        setInterests([]);
        setContacts([]);
        setUserPosts([]);
        setUserPostsError("");

        setViewedAuthUid(targetAuthUid);

        setUserPostsLoading(true);
        setUserPostsError("");

        const [userInfoRes, userProfileRes, userSkillsRes, userInterestsRes, userContactsRes] =
          await Promise.all([
            supabase
              .from("user_info")
              .select("name,batch,department,student_id,departments_lookup(department_name)")
              .eq("auth_uid", targetAuthUid)
              .maybeSingle(),
            supabase
              .from("user_profile")
              .select("bio,profile_picture_url,background_img_url")
              .eq("auth_uid", targetAuthUid)
              .maybeSingle(),
            supabase.from("user_skills").select("skill_id").eq("auth_uid", targetAuthUid),
            supabase
              .from("user_interests")
              .select("interest_id")
              .eq("auth_uid", targetAuthUid),
            supabase
              .from("user_contacts")
              .select("platform_id,contact_link,contacts_platform_lookup(platform)")
              .eq("auth_uid", targetAuthUid),
          ]);

        if (!mounted) return;

        if (userInfoRes.error) throw userInfoRes.error;
        if (userProfileRes.error) throw userProfileRes.error;
        if (userSkillsRes.error) throw userSkillsRes.error;
        if (userInterestsRes.error) throw userInterestsRes.error;
        if (userContactsRes.error) throw userContactsRes.error;

        const info = userInfoRes.data as unknown as UserInfoRow | null;
        const profile = userProfileRes.data as unknown as UserProfileRow | null;

        const skillIds: number[] = [];
        for (const row of (userSkillsRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
          const idVal = row.skill_id;
          if (typeof idVal === "number") skillIds.push(idVal);
        }

        const interestIds: number[] = [];
        for (const row of (userInterestsRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
          const idVal = row.interest_id;
          if (typeof idVal === "number") interestIds.push(idVal);
        }

        const allIds = Array.from(new Set([...skillIds, ...interestIds]));
        const lookupById = new Map<number, string>();
        if (allIds.length) {
          const { data: lookupData, error: lookupError } = await supabase
            .from("skills_lookup")
            .select("id, skill")
            .in("id", allIds);
          if (lookupError) throw lookupError;

          for (const row of (lookupData ?? []) as unknown as Array<Record<string, unknown>>) {
            const idVal = row.id;
            const skillVal = row.skill;
            if (typeof idVal === "number" && typeof skillVal === "string") {
              lookupById.set(idVal, skillVal);
            }
          }
        }

        const loadedSkills = skillIds
          .map((id) => lookupById.get(id))
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0);

        const loadedInterests = interestIds
          .map((id) => lookupById.get(id))
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0);

        const loadedContacts: UserContactItem[] = [];
        for (const row of (userContactsRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
          const platformIdVal = row.platform_id;
          const linkVal = row.contact_link;
          const lookupObj = row.contacts_platform_lookup as Record<string, unknown> | null | undefined;
          const platformVal = lookupObj?.platform;

          if (typeof platformIdVal === "number" && typeof linkVal === "string") {
            loadedContacts.push({
              platformId: platformIdVal,
              platform: typeof platformVal === "string" ? platformVal : "",
              contactLink: linkVal,
            });
          }
        }

        const { data: postsRows, error: postsError } = await supabase
          .from("user_posts")
          .select("post_id, all_posts!user_posts_post_id_fkey(post_id,type,title,description,created_at)")
          .eq("auth_uid", targetAuthUid);

        if (postsError) throw postsError;

        const loadedPosts: UserPostItem[] = [];
        for (const row of (postsRows ?? []) as unknown as Array<Record<string, unknown>>) {
          const postObj = row.all_posts as Record<string, unknown> | null | undefined;
          const postId = postObj?.post_id;
          const type = postObj?.type;
          const title = postObj?.title;
          const description = postObj?.description;
          const createdAtRaw = postObj?.created_at;

          if (
            typeof postId === "string" &&
            typeof type === "string" &&
            typeof title === "string" &&
            typeof description === "string"
          ) {
            const createdAt = typeof createdAtRaw === "string" ? Date.parse(createdAtRaw) : 0;
            loadedPosts.push({
              postId,
              type,
              title,
              description,
              createdAt: Number.isFinite(createdAt) ? createdAt : 0,
            });
          }
        }

        setDisplayName(info?.name?.trim() || "User");
        setStudentId(info?.student_id?.trim() || "");
        setBatchLabel(formatBatchLabel(info));
        setBio(profile?.bio ?? "");
        setProfilePictureUrl(profile?.profile_picture_url ?? null);
        setBackgroundImgUrl(profile?.background_img_url ?? null);
        setSkills(loadedSkills);
        setInterests(loadedInterests);
        setContacts(loadedContacts);
        setUserPosts(loadedPosts.sort((a, b) => b.createdAt - a.createdAt));
      } catch (e: unknown) {
        if (!mounted) return;
        console.error("Failed to load user_info:", e);
        setDisplayName("User");
        setStudentId("");
        setBatchLabel("");
        setBio("");
        setProfilePictureUrl(null);
        setBackgroundImgUrl(null);
        setSkills([]);
        setInterests([]);
        setUserPosts([]);
        setUserPostsError(getErrorMessage(e));
        setContacts([]);
        setViewedAuthUid(null);
      } finally {
        if (mounted) {
          setUserPostsLoading(false);
          setProfileLoading(false);
        }
      }
    }

    loadUserInfo();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // Supabase can emit events on tab focus (e.g. token refresh). Only refetch
      // the profile when the *actual auth user id* changes.
      void (async () => {
        const { data } = await supabase.auth.getUser();
        const nextUid = data.user?.id ?? null;
        if (nextUid === currentAuthUidRef.current) return;
        loadUserInfo();
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, routeStudentId]);

  useEffect(() => {
    let alive = true;

    async function loadContactPlatforms() {
      setContactPlatformsLoading(true);
      setContactPlatformsError("");
      try {
        const { data, error } = await supabase
          .from("contacts_platform_lookup")
          .select("id, platform")
          .order("platform", { ascending: true });

        if (error) throw error;
        if (!alive) return;

        const parsed: ContactPlatformRow[] = [];
        for (const row of (data ?? []) as unknown as Array<Record<string, unknown>>) {
          const idVal = row.id;
          const platformVal = row.platform;
          if (typeof idVal === "number" && typeof platformVal === "string") {
            parsed.push({ id: idVal, platform: platformVal });
          }
        }
        setContactPlatforms(parsed);
      } catch (e: unknown) {
        if (alive) setContactPlatformsError(getErrorMessage(e));
      } finally {
        if (alive) setContactPlatformsLoading(false);
      }
    }

    loadContactPlatforms();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadSkillsLookup() {
      setSkillsLookupLoading(true);
      setSkillsLookupError("");
      try {
        const { data, error } = await supabase
          .from("skills_lookup")
          .select("id, skill")
          .order("skill", { ascending: true });

        if (error) throw error;
        if (alive) {
          const parsed: SkillsLookupItem[] = [];
          for (const row of data ?? []) {
            const rec = row as Record<string, unknown>;
            const idValue = rec.id;
            const skillValue = rec.skill;

            if (typeof idValue === "number" && typeof skillValue === "string") {
              parsed.push({ id: idValue, skill: skillValue });
            }
          }
          setSkillsLookup(parsed);
        }
      } catch (e: unknown) {
        if (alive) setSkillsLookupError(getErrorMessage(e));
      } finally {
        if (alive) setSkillsLookupLoading(false);
      }
    }

    loadSkillsLookup();
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      profileLoading,
      canEdit,
      currentAuthUid,
      viewedAuthUid,

      displayName,
      studentId,
      batchLabel,
      bio,

      profilePictureUrl,
      backgroundImgUrl,

      contacts,

      contactPlatforms,
      contactPlatformsLoading,
      contactPlatformsError,

      skillsLookup,
      skillsLookupLoading,
      skillsLookupError,

      skills,
      interests,

      userPosts,
      userPostsLoading,
      userPostsError,

      setDisplayName,
      setBio,
      setProfilePictureUrl,
      setBackgroundImgUrl,
      setContacts,

      setSkillsLookup,
      setSkills,
      setInterests,
    }),
    [
      profileLoading,
      canEdit,
      currentAuthUid,
      viewedAuthUid,
      displayName,
      studentId,
      batchLabel,
      bio,
      profilePictureUrl,
      backgroundImgUrl,
      contacts,
      contactPlatforms,
      contactPlatformsLoading,
      contactPlatformsError,
      skillsLookup,
      skillsLookupLoading,
      skillsLookupError,
      skills,
      interests,
      userPosts,
      userPostsLoading,
      userPostsError,
    ]
  );

  return <UserProfileContextProvider value={value}>{children}</UserProfileContextProvider>;
}
