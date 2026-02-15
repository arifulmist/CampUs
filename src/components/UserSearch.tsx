import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import placeholderUserImg from "@/assets/images/placeholderUser.png";
import { supabase } from "@/supabase/supabaseClient";

type SearchUserItem = {
  authUid: string;
  studentId: string;
  name: string;
  department: string;
  batch: number | null;
  profilePictureUrl: string | null;
};

export function UserSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const [results, setResults] = useState<SearchUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const lastRequestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      setError("");
      setOpen(false);
      return;
    }

    const requestId = ++lastRequestId.current;
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const { data: users, error: usersError } = await supabase
          .from("user_info")
          .select(
            "auth_uid,name,batch,department,student_id,departments_lookup(department_name)"
          )
          .ilike("name", `%${q}%`)
          .limit(8);

        if (requestId !== lastRequestId.current) return;
        if (usersError) throw usersError;

        const parsedUsers: Array<{
          authUid: string;
          studentId: string;
          name: string;
          department: string;
          batch: number | null;
        }> = [];

        for (const row of (users ?? []) as unknown as Array<Record<string, unknown>>) {
          const authUid = row.auth_uid;
          const name = row.name;
          const studentId = row.student_id;
          const deptIdOrText = row.department;
          const batch = row.batch;
          const deptLookup = row.departments_lookup as Record<string, unknown> | null | undefined;
          const deptName = deptLookup?.department_name;

          if (typeof authUid === "string" && typeof name === "string" && typeof studentId === "string") {
            parsedUsers.push({
              authUid,
              studentId,
              name,
              department:
                (typeof deptName === "string" && deptName.trim())
                  ? deptName
                  : (typeof deptIdOrText === "string" ? deptIdOrText : ""),
              batch: typeof batch === "number" ? batch : null,
            });
          }
        }

        const authUids = parsedUsers.map((u) => u.authUid);
        const profilePicByAuthUid = new Map<string, string>();

        if (authUids.length) {
          const { data: profiles, error: profilesError } = await supabase
            .from("user_profile")
            .select("auth_uid,profile_picture_url")
            .in("auth_uid", authUids);

          if (profilesError) throw profilesError;

          for (const row of (profiles ?? []) as unknown as Array<Record<string, unknown>>) {
            const authUid = row.auth_uid;
            const url = row.profile_picture_url;
            if (typeof authUid === "string" && typeof url === "string" && url.trim()) {
              profilePicByAuthUid.set(authUid, url);
            }
          }
        }

        setResults(
          parsedUsers.map((u) => ({
            ...u,
            profilePictureUrl: profilePicByAuthUid.get(u.authUid) ?? null,
          }))
        );
        setOpen(true);
      } catch (e: unknown) {
        if (requestId !== lastRequestId.current) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setResults([]);
        setOpen(true);
      } finally {
        if (requestId === lastRequestId.current) setLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [query]);

  const goToProfile = (studentId: string) => {
    setOpen(false);
    setQuery("");
    navigate(`/profile/${studentId}`);
  };

  return (
    <div className="lg:relative lg:w-64">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users..."
        className="lg:w-full lg:h-9 lg:rounded-md lg:border border-stroke-grey bg-primary-lm lg:px-3 text-text-lm placeholder:text-text-lighter-lm"
      />
      {open && (
        <div className="lg:absolute lg:z-20 lg:mt-1 lg:w-full lg:rounded-md lg:border border-stroke-grey bg-primary-lm lg:shadow">
          {loading && (
            <div className="lg:px-3 lg:py-2 text-sm text-text-lighter-lm">
              Loading…
            </div>
          )}
          {!loading && error && (
            <div className="lg:px-3 lg:py-2 text-sm text-accent-lm">
              {error}
            </div>
          )}
          {!loading && !error && results.map((u) => (
            <button
              key={u.authUid}
              onClick={() => goToProfile(u.studentId)}
              className="lg:flex lg:w-full lg:items-center lg:gap-2 lg:px-3 lg:py-2 text-left hover:bg-hover-lm"
            >
              <img
                src={u.profilePictureUrl ?? placeholderUserImg}
                className="lg:h-6 lg:w-6 lg:rounded-full lg:border border-stroke-peach"
              />
              <div className="lg:flex-1">
                <div className="text-sm text-text-lm">{u.name}</div>
                <div className="text-xs text-text-lighter-lm">
                  {u.department}{u.batch ? `-${u.batch}` : ""}
                </div>
              </div>
            </button>
          ))}
          {!loading && !error && results.length === 0 && (
            <div className="lg:px-3 lg:py-2 text-sm text-text-lighter-lm">
              No matches
            </div>
          )}
        </div>
      )}
    </div>
  );
}
