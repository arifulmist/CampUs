import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Spinner } from "@/components/ui/spinner";

import {
	getNotifications,
	ensurePostRecommendationNotifications,
	getPostPathById,
	markNotificationsAsRead,
	subscribeToNotifications,
	type NotificationRow,
} from "./utils/notificationUtils";
import { supabase } from "@/supabase/supabaseClient";

export type NotificationDrawerProps = {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	notificationButtonRef?: React.RefObject<HTMLButtonElement | null>;
};

type NotificationKind =
	| "comment_like"
	| "comment_reply"
	| "post_comment"
	| "post_interested"
	| "post_like"
	| "post_recommendation"
	| "unknown";

function normalizeType(type: string) {
	return String(type || "").trim().toLowerCase();
}

function getKind(type: string): NotificationKind {
	const t = normalizeType(type);

	// Your DB enum values (exact):
	if (t === "comment_like") return "comment_like";
	if (t === "comment_reply") return "comment_reply";
	if (t === "post_comment") return "post_comment";
	if (t === "post_interested") return "post_interested";
	if (t === "post_like") return "post_like";
	if (t === "post_recommendation") return "post_recommendation";

	// Optional aliases (tolerate older payloads)
	if (["comment_liked", "liked_comment"].includes(t)) return "comment_like";
	if (["comment_replied", "reply_comment"].includes(t)) return "comment_reply";
	if (["commented_post", "comment_post"].includes(t)) return "post_comment";
	if (["interested_post", "post_interest"].includes(t)) return "post_interested";
	if (["post_liked", "liked_post"].includes(t)) return "post_like";
	if (["tag_match", "skill_match", "interest_match", "matching_tags"].includes(t))
		return "post_recommendation";
	return "unknown";
}

function truncate(text: string, max = 60) {
	const value = String(text || "").trim();
	if (value.length <= max) return value;
	return value.slice(0, max) + "...";
}

type HydratedNotification = {
	key: string;
	kind: NotificationKind;
	createdAt: string;
	isRead: boolean;
	ids: Array<number | string>;
	postId: string | number | null;
	commentId: string | number | null;
	label: ReactNode;
};

export function NotificationDrawer({
	open,
	onOpenChange,
	notificationButtonRef,
}: NotificationDrawerProps) {
	const navigate = useNavigate();

	// Match MessageDrawer sizing/offset.
	const NAVBAR_HEIGHT = 105;
	const NAVBAR_SPACING = 15;

	const drawerRef = useRef<HTMLDivElement>(null);
	const refreshTimeoutRef = useRef<number | null>(null);

	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [rows, setRows] = useState<NotificationRow[]>([]);
	const [loading, setLoading] = useState(true);

	const [actorNameById, setActorNameById] = useState<Map<string, string>>(new Map());
	const [commentPreviewById, setCommentPreviewById] = useState<Map<string, string>>(new Map());
	const [matchingTagsByPostId, setMatchingTagsByPostId] = useState<Map<string, string[]>>(new Map());
	const [postTitleById, setPostTitleById] = useState<Map<string, string>>(new Map());

	// Fetch current auth user id
	useEffect(() => {
		if (!open) return;
		let cancelled = false;

		async function loadUser() {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (cancelled) return;
			setCurrentUserId(user?.id ?? null);
		}

		loadUser();

		return () => {
			cancelled = true;
		};
	}, [open]);

	async function hydrateRelatedData(notifications: NotificationRow[], recipientId: string) {
	type ArrayResponse = { data: Array<Record<string, unknown>>; error: unknown | null };

		const toIdKey = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");

	async function unwrapArrayResponse(
		promise: Promise<{ data: unknown; error: unknown | null }>
	): Promise<ArrayResponse> {
		const res = await promise;
		const arr = Array.isArray(res.data) ? (res.data as Array<Record<string, unknown>>) : [];
		return { data: arr, error: res.error };
	}

		// Actor names
		const actorIds = Array.from(
			new Set(
				notifications
					.map((n) => n.actor_id)
					.filter((x): x is string => typeof x === "string" && x.length > 0)
			)
		);

		// Comment previews (reply/comment notifications)
		const commentIds = Array.from(
			new Set(
				notifications
					.map((n) => n.comment_id)
					.filter((x): x is string => typeof x === "string" && x.length > 0)
			)
		);

		// Post ids for tag-match
		const tagMatchPostIds = Array.from(
			new Set(
				notifications
					.filter((n) => getKind(n.type) === "post_recommendation")
					.map((n) => n.post_id)
					.filter((x): x is string | number =>
						(typeof x === "string" && x.length > 0) || typeof x === "number"
					)
			)
		);

		// Post titles (for post_like/post_interested)
		const postTitleIds = Array.from(
			new Set(
				notifications
					.filter((n) => {
						const kind = getKind(n.type);
						return kind === "post_like" || kind === "post_interested";
					})
					.map((n) => n.post_id)
					.filter((x): x is string | number =>
						(typeof x === "string" && x.length > 0) || typeof x === "number"
					)
			)
		);

		const [
			actorRes,
			commentsRes,
			userSkillsRes,
			userInterestsRes,
			tagsRes,
			skillsLookupRes,
			postTitlesRes,
		] =
			await Promise.all([
				actorIds.length
					? unwrapArrayResponse(
						(supabase
							.from("user_info")
							.select("auth_uid,name")
							.in("auth_uid", actorIds) as unknown as Promise<{ data: unknown; error: unknown | null }>),
						)
					: Promise.resolve({ data: [], error: null } satisfies ArrayResponse),
				commentIds.length
					? unwrapArrayResponse(
						(supabase
							.from("comments")
							.select("comment_id,content")
							.in("comment_id", commentIds) as unknown as Promise<{ data: unknown; error: unknown | null }>),
						)
					: Promise.resolve({ data: [], error: null } satisfies ArrayResponse),
				unwrapArrayResponse(
					(supabase
						.from("user_skills")
						.select("skill_id")
						.eq("auth_uid", recipientId) as unknown as Promise<{ data: unknown; error: unknown | null }>),
				),
				unwrapArrayResponse(
					(supabase
						.from("user_interests")
						.select("interest_id")
						.eq("auth_uid", recipientId) as unknown as Promise<{ data: unknown; error: unknown | null }>),
				),
				tagMatchPostIds.length
					? unwrapArrayResponse(
						(supabase
							.from("post_tags")
							.select("post_id,skill_id")
							.in("post_id", tagMatchPostIds) as unknown as Promise<{ data: unknown; error: unknown | null }>),
						)
					: Promise.resolve({ data: [], error: null } satisfies ArrayResponse),
				tagMatchPostIds.length
					? unwrapArrayResponse(
						(supabase
							.from("skills_lookup")
							.select("id,skill") as unknown as Promise<{ data: unknown; error: unknown | null }>),
						)
					: Promise.resolve({ data: [], error: null } satisfies ArrayResponse),
				postTitleIds.length
					? unwrapArrayResponse(
						(supabase
							.from("all_posts")
							.select("post_id,title")
							.in("post_id", postTitleIds as Array<string | number>) as unknown as Promise<{ data: unknown; error: unknown | null }>),
						)
					: Promise.resolve({ data: [], error: null } satisfies ArrayResponse),
			]);

		if (!actorRes.error) {
			const next = new Map<string, string>();
			for (const r of (actorRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
				const id = r.auth_uid;
				const name = r.name;
				if (typeof id === "string" && id && typeof name === "string" && name.trim()) {
					next.set(id, name.trim());
				}
			}
			setActorNameById(next);
		}

		if (!commentsRes.error) {
			const next = new Map<string, string>();
			for (const r of (commentsRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
				const id = r.comment_id;
				const content = r.content;
				if (typeof id === "string" && id && typeof content === "string") {
					next.set(id, content);
				}
			}
			setCommentPreviewById(next);
		}

		if (!postTitlesRes.error) {
			const next = new Map<string, string>();
			for (const r of (postTitlesRes.data ?? []) as Array<Record<string, unknown>>) {
				const id = toIdKey(r.post_id);
				const title = r.title;
				if (id && typeof title === "string" && title.trim()) {
					next.set(id, title.trim());
				}
			}
			setPostTitleById(next);
		}

		if (tagMatchPostIds.length && !tagsRes.error && !skillsLookupRes.error) {
			const mySkillIds = new Set<number>();
			for (const r of (userSkillsRes.data ?? []) as Array<Record<string, unknown>>) {
				const id = r.skill_id;
				if (typeof id === "number") mySkillIds.add(id);
			}
			for (const r of (userInterestsRes.data ?? []) as Array<Record<string, unknown>>) {
				const id = r.interest_id;
				if (typeof id === "number") mySkillIds.add(id);
			}

			const skillNameById = new Map<number, string>();
			for (const s of (skillsLookupRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
				const id = s.id;
				const skill = s.skill;
				if (typeof id === "number" && typeof skill === "string" && skill.trim()) {
					skillNameById.set(id, skill.trim());
				}
			}

			const next = new Map<string, string[]>();
			for (const t of (tagsRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
				const postIdKey = toIdKey(t.post_id);
				const skillId = t.skill_id;
				if (!postIdKey || typeof skillId !== "number") continue;
				if (!mySkillIds.has(skillId)) continue;
				const name = skillNameById.get(skillId);
				if (!name) continue;
				const arr = next.get(postIdKey) ?? [];
				if (!arr.includes(name)) arr.push(name);
				next.set(postIdKey, arr);
			}
			setMatchingTagsByPostId(next);
		} else {
			setMatchingTagsByPostId(new Map());
		}
	}

	// Fetch notifications when opened
	useEffect(() => {
		if (!open) return;
		const recipientId = currentUserId ?? "";
		if (!recipientId) return;

		let cancelled = false;

		async function load() {
			setLoading(true);
			try {
				// Best-effort: seed recommended post notifications if the backend isn't generating them.
				try {
					await ensurePostRecommendationNotifications(recipientId);
				} catch {
					// ignore
				}
				const items = await getNotifications(recipientId);
				if (cancelled) return;
				setRows(items);
				await hydrateRelatedData(items, recipientId);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [open, currentUserId]);

	// Realtime subscription
	useEffect(() => {
		if (!open) return;
		const recipientId = currentUserId ?? "";
		if (!recipientId) return;

		async function refresh() {
			const items = await getNotifications(recipientId);
			setRows(items);
			await hydrateRelatedData(items, recipientId);
		}

		function queueRefresh() {
			if (refreshTimeoutRef.current) return;
			refreshTimeoutRef.current = window.setTimeout(async () => {
				refreshTimeoutRef.current = null;
				await refresh();
			}, 150);
		}

		const unsubscribe = subscribeToNotifications(recipientId, queueRefresh);

		return () => {
			if (refreshTimeoutRef.current) {
				window.clearTimeout(refreshTimeoutRef.current);
				refreshTimeoutRef.current = null;
			}
			unsubscribe();
		};
	}, [open, currentUserId]);

	// Handle click outside to close
	useEffect(() => {
		type CampUsWindow = Window & { __campusImagePreviewOpen?: boolean };

		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Element | null;
			if (
				target?.closest?.(
					'[data-slot="dialog-content"], [data-slot="dialog-overlay"], [data-slot="dialog-portal"]'
				)
			) {
				return;
			}

			if ((window as CampUsWindow).__campusImagePreviewOpen) return;

			if (
				drawerRef.current &&
				!drawerRef.current.contains(event.target as Node) &&
				!(notificationButtonRef?.current?.contains(event.target as Node))
			) {
				onOpenChange(false);
			}
		}

		if (open) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [open, onOpenChange, notificationButtonRef]);

	const hydrated: HydratedNotification[] = useMemo(() => {
		const byPostLikePostId = new Map<
			string,
			{
				rows: NotificationRow[];
				latestCreatedAt: string;
				postIdRaw: string | number;
			}
		>();

		const others: NotificationRow[] = [];

		for (const r of rows) {
			const kind = getKind(r.type);
			if (kind === "post_like" && (typeof r.post_id === "string" || typeof r.post_id === "number") && r.post_id !== null) {
				const postIdKey = String(r.post_id);
				const existing = byPostLikePostId.get(postIdKey);
				const created = r.created_at ?? "";
				if (!existing) {
					byPostLikePostId.set(postIdKey, { rows: [r], latestCreatedAt: created, postIdRaw: r.post_id });
				} else {
					existing.rows.push(r);
					if (created && created > existing.latestCreatedAt) existing.latestCreatedAt = created;
				}
			} else {
				others.push(r);
			}
		}

		const items: HydratedNotification[] = [];

		// Aggregated post likes
		for (const [postIdKey, group] of byPostLikePostId.entries()) {
			const groupRows = [...group.rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
			const count = groupRows.length;
			const isRead = groupRows.every((x) => Boolean(x.is_read));
			const ids = groupRows.map((x) => x.id);

			const names = groupRows
				.map((x) => (typeof x.actor_id === "string" ? actorNameById.get(x.actor_id) : undefined))
				.filter((x): x is string => typeof x === "string" && x.trim().length > 0);

			const uniqueNames: string[] = [];
			for (const n of names) {
				if (!uniqueNames.includes(n)) uniqueNames.push(n);
			}

			const postTitle = postTitleById.get(postIdKey) ?? "";
			const titleNode = postTitle ? <span className="font-semibold"> {postTitle}</span> : null;

			const label = (() => {
				if (count <= 0) return "Someone has liked your post!";
				if (count === 1) {
					const a = uniqueNames[0] ?? "Someone";
					return (
						<>
							{a} has liked your post "{titleNode}"!
						</>
					);
				}
				if (count === 2) {
					const a = uniqueNames[0] ?? "Someone";
					const b = uniqueNames[1] ?? "Someone";
					return (
						<>
							{a} and {b} have liked your post "{titleNode}"!
						</>
					);
				}
				if (count === 3) {
					const a = uniqueNames[0] ?? "Someone";
					const b = uniqueNames[1] ?? "Someone";
					const c = uniqueNames[2] ?? "Someone";
					return (
						<>
							{a}, {b} and {c} have liked your post "{titleNode}"!
						</>
					);
				}
				const a = uniqueNames[0] ?? "Someone";
				const b = uniqueNames[1] ?? "Someone";
				const othersCount = Math.max(0, count - 2);
				return (
					<>
						{a}, {b} and {othersCount} others have liked your post "{titleNode}"!
					</>
				);
			})();

			items.push({
				key: `post_like:${postIdKey}`,
				kind: "post_like",
				createdAt: group.latestCreatedAt,
				isRead,
				ids,
				postId: group.postIdRaw,
				commentId: null,
				label,
			});
		}

		// Non-aggregated
		for (const r of others) {
			const kind = getKind(r.type);
			const actorName = typeof r.actor_id === "string" ? actorNameById.get(r.actor_id) : undefined;
			const actor = actorName?.trim() || "Someone";

			const label = (() => {
				switch (kind) {
					case "comment_like":
						{
							const preview = typeof r.comment_id === "string" ? commentPreviewById.get(r.comment_id) : "";
							const snippet = preview ? truncate(preview, 60) : "";
							return snippet
								? `${actor} has liked your comment : "${snippet}"`
								: `${actor} has liked your comment! Come check it out.`;
						}
					case "comment_reply": {
						const preview = typeof r.comment_id === "string" ? commentPreviewById.get(r.comment_id) : "";
						const snippet = preview ? truncate(preview, 60) : "";
						return snippet
							? `${actor} has replied to your comment : "${snippet}"`
							: `${actor} has replied to your comment! Come check it out.`;
					}
					case "post_comment": {
						const preview = typeof r.comment_id === "string" ? commentPreviewById.get(r.comment_id) : "";
						const snippet = preview ? truncate(preview, 60) : "";
						return snippet
							? `${actor} has commented under your post: "${snippet}"`
							: `${actor} has commented under your post! Come check it out.`;
					}
					case "post_interested":
						{
							const title = r.post_id !== null && r.post_id !== undefined ? postTitleById.get(String(r.post_id)) ?? "" : "";
							return (
								<>
									{actor} has shown interest in your post
									{title ? <span className="font-semibold"> {title}</span> : null}!
								</>
							);
						}
					case "post_recommendation": {
						const tags = r.post_id !== null && r.post_id !== undefined ? matchingTagsByPostId.get(String(r.post_id)) ?? [] : [];
						const shown = tags.slice(0, 3);
						const tail = shown.length ? ` Post features: ${shown.join(", ")}` : "";
						return `We think you might like this post! Come check it out.${tail}`;
					}
					default:
						return "You have a new notification.";
				}
			})();

			items.push({
				key: `n:${r.id}`,
				kind,
				createdAt: r.created_at ?? "",
				isRead: Boolean(r.is_read),
				ids: [r.id],
				postId: typeof r.post_id === "string" || typeof r.post_id === "number" ? r.post_id : null,
				commentId: typeof r.comment_id === "string" || typeof r.comment_id === "number" ? r.comment_id : null,
				label,
			});
		}

		items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
		return items;
	}, [rows, actorNameById, commentPreviewById, matchingTagsByPostId, postTitleById]);

	const unreadCount = useMemo(
		() => hydrated.reduce((sum, n) => sum + (n.isRead ? 0 : 1), 0),
		[hydrated]
	);

	const handleNotificationClick = async (n: HydratedNotification) => {
		if (!currentUserId) return;

		// Only mark as read after click (as requested)
		const markReadIds = n.ids;

		const postId = n.postId;
		const commentId = n.commentId;

		try {
			let targetPath: string | null = null;
			if (postId) {
				targetPath = await getPostPathById(postId);
			}

			if (targetPath) {
				if (
					commentId &&
					(n.kind === "comment_like" || n.kind === "comment_reply" || n.kind === "post_comment")
				) {
					if (!postId) {
						navigate(targetPath);
					} else {
						const postIdForScroll = String(postId);
					try {
						type Marker = { postId: string; commentId: string; ts: number };
						const win = window as unknown as { __campus_last_scroll_comment?: Marker };
						win.__campus_last_scroll_comment = {
							postId: postIdForScroll,
							commentId: String(commentId),
							ts: Date.now(),
						};
					} catch {
						// ignore
					}

					navigate(targetPath);
					// Best-effort immediate event (marker handles the "event before mount" case)
					window.setTimeout(() => {
						window.dispatchEvent(
							new CustomEvent("campus:scroll_to_comment", {
								detail: { postId: postIdForScroll, commentId: String(commentId) },
							})
						);
					}, 0);
					}
				} else {
					navigate(targetPath);
				}
			}

			onOpenChange(false);

			await markNotificationsAsRead(markReadIds);
			// Let TopNav (and any other listeners) refresh badge state immediately.
			window.dispatchEvent(new CustomEvent("campus:notifications_changed"));

			// Optimistic UI update
			setRows((prev) =>
				prev.map((r) =>
					markReadIds.includes(r.id) ? { ...r, is_read: true } : r
				)
			);
		} catch (e) {
			console.error("Failed to open notification:", e);
			onOpenChange(false);
		}
	};

	if (!open) return null;

	return (
		<div
			ref={drawerRef}
			className={`bg-primary-lm lg:w-[25vw] fixed right-0 border border-stroke-grey lg:rounded-md lg:rounded-b-none z-50 flex flex-col overflow-hidden ${
				!open ? "animate-slide-out-from-right" : "animate-slide-in-from-right"
			}`}
			style={{
				top: NAVBAR_HEIGHT + NAVBAR_SPACING,
				height: `calc(100vh - ${NAVBAR_HEIGHT + NAVBAR_SPACING}px)`,
			}}
		>
			<div className="lg:px-4 lg:py-5 flex flex-col h-full min-h-0">
				<div>
					<div className="flex items-center justify-between">
						<h5 className="text-accent-lm font-header font-semibold m-0">
							Notifications
						</h5>
						{unreadCount > 0 ? (
							<p className="m-0 p-0 text-sm text-text-lighter-lm">
								{unreadCount} unread
							</p>
						) : null}
					</div>
					<hr className="border-accent-lm lg:mt-3 lg:mb-1" />
				</div>

				<div className="flex-1 min-h-0 overflow-y-auto">
					{loading ? (
						<div className="flex items-center justify-center min-h-[50vh]">
							<div className="flex flex-col items-center gap-3">
								<Spinner className="size-12 text-accent-lm" />
								<p className="text-md text-text-lighter-lm">Loading...</p>
							</div>
						</div>
					) : hydrated.length === 0 ? (
						<div className="flex flex-col items-center justify-center min-h-[50vh]">
							<p className="lg:m-0 lg:p-0 text-center text-text-lighter-lm">
								No notifications.
							</p>
						</div>
					) : (
						hydrated.map((n, index) => (
							<div key={n.key}>
								<NotificationRowItem
									label={n.label}
									isUnread={!n.isRead}
									onClick={() => void handleNotificationClick(n)}
								/>
								{index < hydrated.length - 1 && (
									<hr className="border-stroke-grey lg:my-1" />
								)}
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}

function NotificationRowItem({
	label,
	isUnread,
	onClick,
}: {
	label: ReactNode;
	isUnread: boolean;
	onClick: () => void;
}) {
	return (
		<button
			onClick={onClick}
			className={`flex items-center w-full justify-between lg:px-2 lg:py-4 lg:rounded-lg hover:bg-hover-lm transition duration-150 text-left ${
				isUnread && "bg-hover-lm"
			}`}
		>
			<div className="flex flex-col pr-4">
				<p className={`m-0 p-0 text-sm ${isUnread ? "text-text-lm font-medium" : "text-text-lighter-lm/70"}`}>
					{label}
				</p>
			</div>
			{isUnread && <span className="size-2 shrink-0 bg-accent-lm rounded-full animate-pulse" />}
		</button>
	);
}

