import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/supabase/supabaseClient";
import { UserInfo } from "./UserInfo";
import crossBtn from "@/assets/icons/cross_btn.svg";

interface Liker {
  user_id: string;
  name: string;
  liked_at?: string;
}

type LikerDetails = {
  userId: string;
  name: string;
  batchLabel: string;
  studentId: string | null;
};

interface LikedByTextProps {
  postId: string;
  likeCount: number;
}

/**
 * Displays a Facebook/Instagram-style "liked by" line.
 *
 * - ≤ 3 likes  → "A liked this" / "A and B liked this" / "A, B and C liked this"
 * - > 3 likes  → "A, B, C and N others" ("N others" opens modal)
 */
export function LikedByText({ postId, likeCount }: LikedByTextProps) {
  const [likers, setLikers] = useState<Liker[]>([]);
  const [fetched, setFetched] = useState(false);
  const [isLikesModalOpen, setIsLikesModalOpen] = useState(false);
  const [modalLikers, setModalLikers] = useState<LikerDetails[]>([]);
  const [modalFetched, setModalFetched] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  function openLikesModal() {
    setModalFetched(false);
    setModalError(null);
    setModalLikers([]);
    setIsLikesModalOpen(true);
  }

  function closeLikesModal() {
    setIsLikesModalOpen(false);
  }

  useEffect(() => {
    if (likeCount <= 0) {
      // Defer state updates to avoid synchronous setState inside effect.
      queueMicrotask(() => {
        setLikers([]);
        setFetched(true);
      });
      return;
    }

    let alive = true;

    // For the inline line we only ever need up to 3 most recent names.
    const limit = Math.min(likeCount, 3);

    (async () => {
      const { data, error } = await supabase.rpc("get_post_likers", {
        p_post_id: postId,
        p_limit: limit,
      });

      if (!alive) return;

      if (error) {
        console.error("Failed to fetch likers:", error);
        setFetched(true);
        return;
      }

      setLikers(
        (data as Liker[] | null)?.map((d) => ({
          user_id: d.user_id,
          name: d.name,
          liked_at: d.liked_at,
        })) ?? [],
      );
      setFetched(true);
    })();

    return () => {
      alive = false;
    };
  }, [postId, likeCount]);

  const orderedNames = useMemo(() => {
    // RPC already orders by most-recent first, but keep a deterministic fallback.
    return [...likers]
      .sort((a, b) => (b.liked_at ?? "").localeCompare(a.liked_at ?? ""))
      .map((l) => l.name);
  }, [likers]);

  useEffect(() => {
    if (!isLikesModalOpen) return;
    if (likeCount <= 0) return;

    let alive = true;

    (async () => {
      const { data, error } = await supabase.rpc("get_post_likers", {
        p_post_id: postId,
        p_limit: likeCount,
      });

      if (!alive) return;

      if (error) {
        console.error("Failed to fetch likers for modal:", error);
        setModalError("Failed to load likes");
        setModalFetched(true);
        return;
      }

      const rows = (data as Liker[] | null) ?? [];
      const orderedUserIds = rows.map((r) => r.user_id).filter(Boolean);

      if (orderedUserIds.length === 0) {
        setModalFetched(true);
        return;
      }

      const { data: userInfoData, error: userInfoError } = await supabase
        .from("user_info")
        .select(
          "auth_uid, name, batch, department, student_id, departments_lookup(department_name)",
        )
        .in("auth_uid", orderedUserIds);

      if (!alive) return;

      if (userInfoError) {
        console.error("Failed to fetch user_info for likers:", userInfoError);
        setModalError("Failed to load likes");
        setModalFetched(true);
        return;
      }

      const infoRows =
        (userInfoData as unknown as Array<{
          auth_uid?: unknown;
          name?: unknown;
          batch?: unknown;
          department?: unknown;
          student_id?: unknown;
          departments_lookup?: { department_name?: unknown } | null;
        }>) ?? [];

      const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      const byAuthUid = new Map(
        infoRows
          .map((r) => {
            const authUid = typeof r.auth_uid === "string" ? r.auth_uid : null;
            if (!authUid) return null;

            const name = typeof r.name === "string" && r.name.trim() ? r.name : "Unknown";
            const batch =
              typeof r.batch === "string"
                ? r.batch.trim()
                : typeof r.batch === "number"
                  ? String(r.batch)
                  : "";
            const deptNameFromLookup =
              typeof r.departments_lookup?.department_name === "string"
                ? r.departments_lookup.department_name
                : "";
            const rawDepartment = typeof r.department === "string" ? r.department : "";

            // Prefer departments_lookup.department_name to avoid dept_id-batch display.
            const deptPart = (
              deptNameFromLookup || (!uuidLike.test(rawDepartment.trim()) ? rawDepartment : "")
            ).trim();

            const batchLabel = deptPart && batch ? `${deptPart}-${batch}` : deptPart || batch;
            const studentId =
              typeof r.student_id === "string" && r.student_id.trim()
                ? r.student_id
                : null;

            const entry: LikerDetails = {
              userId: authUid,
              name,
              batchLabel,
              studentId,
            };
            return [authUid, entry] as const;
          })
          .filter(Boolean) as Array<readonly [string, LikerDetails]>,
      );

      const ordered = orderedUserIds
        .map((id) => byAuthUid.get(id))
        .filter(Boolean) as LikerDetails[];

      setModalLikers(ordered);
      setModalFetched(true);
    })();

    return () => {
      alive = false;
    };
  }, [isLikesModalOpen, likeCount, postId]);

  useEffect(() => {
    if (!isLikesModalOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeLikesModal();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isLikesModalOpen]);

  if (likeCount <= 0 || !fetched || likers.length === 0) return null;

  return (
    <>
      <p className="text-sm text-text-lighter-lm mt-1 truncate">
        {likeCount > 3
          ? formatTop3WithOthersButton(orderedNames, likeCount, openLikesModal)
          : formatNamesAsBold(orderedNames)}
      </p>

      {isLikesModalOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-1000"
                style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                onClick={closeLikesModal}
              />

              <div className="fixed inset-0 z-1001 flex items-center justify-center p-6">
                <div
                  className="bg-primary-lm w-full max-w-md rounded-xl border border-stroke-grey overflow-hidden max-h-[calc(100vh-96px)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-4 py-3 border-b border-stroke-grey flex items-center justify-between">
                    <p className="text-text-lm font-semibold font-header text-lg">Likes</p>
                    <button
                      type="button"
                      onClick={closeLikesModal}
                      className="cursor-pointer"
                      aria-label="Close modal"
                    >
                      <img src={crossBtn} alt="Close" />
                    </button>
                  </div>

                  <div className="px-4 py-3 max-h-[70vh] overflow-y-auto">
                    {!modalFetched ? (
                      <p className="text-sm text-text-lighter-lm">Loading...</p>
                    ) : modalError ? (
                      <p className="text-sm text-text-lighter-lm">{modalError}</p>
                    ) : modalLikers.length === 0 ? (
                      <p className="text-sm text-text-lighter-lm">No likes yet</p>
                    ) : (
                      <div>
                        {modalLikers.map((u, idx) => (
                          <div key={u.userId}>
                            <div className="py-2">
                              <UserInfo
                                userName={u.name}
                                userBatch={u.batchLabel}
                                userId={u.userId}
                                studentId={u.studentId ?? undefined}
                              />
                            </div>
                            {idx < modalLikers.length - 1 ? (
                              <hr className="border-stroke-grey" />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}

/** Renders names with bold styling for ≤ 5 likes */
function formatNamesAsBold(names: string[]) {
  if (names.length === 1) {
    return (
      <>
        <span className="font-semibold text-text-lm">{names[0]}</span>
        <span className="font-normal"> liked this</span>
      </>
    );
  }

  const allButLast = names.slice(0, -1);
  const last = names[names.length - 1];

  return (
    <>
      {allButLast.map((n, i) => (
        <span key={n + i}>
          <span className="font-semibold text-text-lm">{n}</span>
          {i < allButLast.length - 1 ? ", " : ""}
        </span>
      ))}
      <span className="font-normal"> and </span>
      <span className="font-semibold text-text-lm">{last}</span>
      <span className="font-normal"> liked this</span>
    </>
  );
}


/**
 * Renders "A, B, C and N others" when total likes > 3.
 * The "N others" part is a semibold, underlined button which opens the likes modal.
 */
function formatTop3WithOthersButton(
  orderedNames: string[],
  totalCount: number,
  onOpenModal: () => void,
) {
  const top3 = orderedNames.slice(0, 3);
  const othersCount = Math.max(0, totalCount - 3);

  return (
    <>
      {top3.map((n, i) => (
        <span key={n + i}>
          <span className="font-normal text-text-lm">{n}</span>
          {i < top3.length - 1 ? ", " : ""}
        </span>
      ))}
      <span className="font-normal"> and </span>
      <button
        type="button"
        onClick={onOpenModal}
        className="font-semibold underline text-text-lm cursor-pointer"
      >
        {othersCount} {othersCount === 1 ? "other" : "others"}
      </button>
    </>
  );
}
