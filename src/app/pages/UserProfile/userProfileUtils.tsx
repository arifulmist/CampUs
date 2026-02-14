/* eslint-disable react-refresh/only-export-components */

import placeholderUserImg from "@/assets/images/placeholderUser.png";
import Github from "@/assets/icons/github_icon.svg";
import Facebook from "@/assets/icons/facebook_icon.svg";
import Instagram from "@/assets/icons/instagram_icon.png";
import Whatsapp from "@/assets/icons/whatsapp_icon.svg";
import LinkedIn from "@/assets/icons/linkedin_icon.svg";
import Email from "@/assets/icons/email_icon.png";
import Discord from "@/assets/icons/discord_icon.svg";

import { useEffect, useMemo } from "react";

import type { UserInfoRow } from "./profile-types";
import { supabase } from "../../../supabase/supabaseClient";

export const PLACEHOLDER_USER_IMG = placeholderUserImg;

const PROFILE_IMAGES_BUCKET = "profile_images";
export const MAX_PROFILE_IMAGE_BYTES = 10 * 1024 * 1024;

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const rec = error as Record<string, unknown>;
    const msg = rec.message;
    const details = rec.details;
    const hint = rec.hint;
    const code = rec.code;

    const parts: string[] = [];
    if (typeof msg === "string" && msg.trim()) parts.push(msg.trim());
    if (typeof details === "string" && details.trim()) parts.push(details.trim());
    if (typeof hint === "string" && hint.trim()) parts.push(hint.trim());
    if (typeof code === "string" && code.trim()) parts.push(`Code: ${code.trim()}`);
    if (parts.length) return parts.join(" — ");
  }
  return "Unexpected error";
}

function extForMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/jpg") return "jpg";
  return "bin";
}

export function generateUuidV4() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();

  // RFC4122-ish fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"] as const;
type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export function isAllowedImage(file: File): file is File & { type: AllowedImageType } {
  return ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType);
}

export function useObjectUrl(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return url;
}

export async function uploadProfileImage(authUid: string, file: File): Promise<string> {
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("Image must be 10MB or smaller.");
  }
  if (!isAllowedImage(file)) {
    throw new Error("Only PNG, JPG, and JPEG files are allowed.");
  }

  const ext = extForMime(file.type);
  const fileName = `${generateUuidV4()}.${ext}`;
  const filePath = `${authUid}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    const msg = String((uploadError as unknown as { message?: unknown })?.message ?? "");
    if (msg.toLowerCase().includes("row-level security")) {
      throw new Error(
        "Upload blocked by Supabase Storage RLS (storage.objects). Add an INSERT policy for bucket 'profile_images' allowing authenticated users to upload their own objects."
      );
    }
    throw uploadError;
  }

  const { data: publicData } = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(filePath);
  return publicData.publicUrl;
}

export function formatBatchLabel(profile: UserInfoRow | null): string {
  const deptName = profile?.departments_lookup?.department_name || profile?.department || "";
  const batchValue = profile?.batch ?? null;
  return deptName && batchValue ? `${deptName}-${batchValue}` : "";
}

export function normalizePlatform(text: string) {
  return text.trim().toLowerCase();
}

export function getPlatformIconSrc(platform: string): string {
  const p = normalizePlatform(platform);

  // Exact values from contacts_platform_lookup (case-insensitive)
  if (p === "facebook") return Facebook;
  if (p === "instagram") return Instagram;
  if (p === "github") return Github;
  if (p === "email") return Email;
  if (p === "whatsapp") return Whatsapp;
  if (p === "discord") return Discord;
  if (p === "linkedin") return LinkedIn;

  if (p.includes("github")) return Github;
  if (p.includes("linked") || p.includes("linkedin")) return LinkedIn;
  if (p.includes("facebook")) return Facebook;
  if (p.includes("instagram")) return Instagram;
  if (p.includes("whatsapp") || p.includes("wa")) return Whatsapp;
  if (p.includes("discord")) return Discord;
  if (p.includes("mail") || p.includes("email") || p.includes("gmail")) return Email;

  return Email;
}

export function displayContactLinkText(link: string) {
  const trimmed = link.trim();
  if (!trimmed) return "";
  if (/^mailto:/i.test(trimmed)) return trimmed.replace(/^mailto:/i, "");
  try {
    const u = new URL(trimmed);
    const segments = u.pathname.split("/").filter(Boolean);
    const tail = segments.length ? `/${segments[segments.length - 1]}` : "";
    return `${u.hostname}${tail}`;
  } catch {
    return trimmed;
  }
}

export function toExternalContactHref(platform: string, link: string) {
  const raw = link.trim();
  if (!raw) return "#";

  const p = normalizePlatform(platform);
  if (p === "email") {
    if (/^mailto:/i.test(raw)) return raw;
    return `mailto:${raw}`;
  }

  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^mailto:/i.test(raw)) return raw;

  const noLeadingSlashes = raw.replace(/^\/+/, "");
  return `https://${noLeadingSlashes}`;
}
