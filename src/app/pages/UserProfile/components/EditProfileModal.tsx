import crossBtnIcon from "@/assets/icons/cross_btn.svg";
import { LucidePlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
  ContactPlatformRow,
  UserContactDraftItem,
  UserContactItem,
} from "../profile-types";

import { supabase } from "../../../../../supabase/supabaseClient";
import {
  generateUuidV4,
  getErrorMessage,
  getPlatformIconSrc,
  isAllowedImage,
  MAX_PROFILE_IMAGE_BYTES,
  PLACEHOLDER_USER_IMG,
  uploadProfileImage,
  useObjectUrl,
} from "../userProfileUtils";

type Props = {
  open: boolean;
  canEdit: boolean;
  currentAuthUid: string | null;

  displayName: string;
  bio: string;
  profilePictureUrl: string | null;
  contacts: UserContactItem[];

  contactPlatforms: ContactPlatformRow[];
  contactPlatformsLoading: boolean;
  contactPlatformsError: string;

  onClose: () => void;
  onSaved: (next: {
    displayName: string;
    bio: string;
    profilePictureUrl: string | null;
    contacts: UserContactItem[];
    savedDraftFile?: File | null;
  }) => void;
};

export function EditProfileModal({
  open,
  canEdit,
  currentAuthUid,
  displayName,
  bio,
  profilePictureUrl,
  contacts,
  contactPlatforms,
  contactPlatformsLoading,
  contactPlatformsError,
  onClose,
  onSaved,
}: Props) {
  const [profileDraftFile, setProfileDraftFile] = useState<File | null>(null);
  const [profileFileError, setProfileFileError] = useState<string>("");
  const [profileSaveError, setProfileSaveError] = useState<string>("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profilePictureRemove, setProfilePictureRemove] = useState(false);

  const [nameDraft, setNameDraft] = useState<string>(displayName);
  const [bioDraft, setBioDraft] = useState<string>(bio);

  const [selectedContactPlatformId, setSelectedContactPlatformId] = useState<string>("");
  const [contactPickerOpen, setContactPickerOpen] = useState<boolean>(false);
  const [contactsDraft, setContactsDraft] = useState<UserContactDraftItem[]>([]);
  const [contactsDraftError, setContactsDraftError] = useState<string>("");

  const profileDraftUrl = useObjectUrl(profileDraftFile);

  const effectiveProfilePreviewUrl = useMemo(() => {
    if (profilePictureRemove) return PLACEHOLDER_USER_IMG;
    return profileDraftUrl ?? profilePictureUrl ?? PLACEHOLDER_USER_IMG;
  }, [profilePictureRemove, profileDraftUrl, profilePictureUrl]);

  useEffect(() => {
    if (!open) return;
    setProfileDraftFile(null);
    setProfileFileError("");
    setProfileSaveError("");
    setProfilePictureRemove(false);
    setNameDraft(displayName);
    setBioDraft(bio);
    setContactsDraftError("");
    setSelectedContactPlatformId("");
    setContactPickerOpen(false);
    setContactsDraft(
      contacts.map((c) => ({
        key: generateUuidV4(),
        platformId: c.platformId,
        contactLink: c.contactLink,
      }))
    );
  }, [open, displayName, bio, contacts]);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const onPickProfileFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setProfileFileError("Image must be 10MB or smaller.");
      setProfileDraftFile(null);
      return;
    }
    if (!isAllowedImage(file)) {
      setProfileFileError("Only PNG, JPG, and JPEG files are allowed.");
      setProfileDraftFile(null);
      return;
    }
    setProfileFileError("");
    setProfileDraftFile(file);
    setProfilePictureRemove(false);
  };

  const saveProfile = async () => {
    if (!canEdit) {
      setProfileSaveError("You can only edit your own profile.");
      return;
    }

    const nextName = nameDraft.trim();
    const nextBio = bioDraft.trim();

    if (!nextName) {
      setProfileSaveError("Name cannot be empty.");
      return;
    }

    setProfileSaving(true);
    setProfileSaveError("");
    setContactsDraftError("");

    try {
      let authUid = currentAuthUid;
      if (!authUid) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        authUid = userData.user?.id ?? null;
      }

      if (!authUid) {
        setProfileSaveError("You need to be logged in to save changes.");
        return;
      }

      let nextProfilePictureUrl = profilePictureUrl;
      if (profilePictureRemove) {
        nextProfilePictureUrl = null;
      } else if (profileDraftFile) {
        nextProfilePictureUrl = await uploadProfileImage(authUid, profileDraftFile);
      }

      const { error: userInfoError } = await supabase
        .from("user_info")
        .upsert({ auth_uid: authUid, name: nextName }, { onConflict: "auth_uid" });
      if (userInfoError) throw userInfoError;

      const { error: userProfileError } = await supabase
        .from("user_profile")
        .upsert(
          {
            auth_uid: authUid,
            bio: nextBio ? nextBio : null,
            profile_picture_url: nextProfilePictureUrl,
          },
          { onConflict: "auth_uid" }
        );
      if (userProfileError) throw userProfileError;

      const cleanedContacts = contactsDraft
        .map((c) => ({
          platformId: c.platformId,
          contactLink: c.contactLink.trim(),
        }))
        .filter((c) => Number.isFinite(c.platformId) && c.contactLink.length > 0);

      const { error: deleteContactsError } = await supabase
        .from("user_contacts")
        .delete()
        .eq("auth_uid", authUid);
      if (deleteContactsError) throw deleteContactsError;

      if (cleanedContacts.length) {
        const { error: insertContactsError } = await supabase.from("user_contacts").insert(
          cleanedContacts.map((c) => ({
            platform_id: c.platformId,
            contact_link: c.contactLink,
          }))
        );
        if (insertContactsError) throw insertContactsError;
      }

      const nextContacts: UserContactItem[] = cleanedContacts.map((c) => ({
        platformId: c.platformId,
        platform: contactPlatforms.find((p) => p.id === c.platformId)?.platform ?? "",
        contactLink: c.contactLink,
      }));

      onSaved({
        displayName: nextName,
        bio: nextBio,
        profilePictureUrl: nextProfilePictureUrl ?? null,
        contacts: nextContacts,
        savedDraftFile: profileDraftFile,
      });

      onClose();
    } catch (e: unknown) {
      setProfileSaveError(getErrorMessage(e));
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0"
        style={{ zIndex: 10000, backgroundColor: "rgba(0,0,0,0.7)" }}
        onMouseDown={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 10001 }}>
        <div
          className="bg-secondary-lm border-2 border-stroke-grey lg:rounded-xl lg:px-8 lg:py-6 lg:w-130 lg:relative lg:animate-slide-in max-h-[85vh] overflow-y-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="lg:flex lg:justify-between lg:items-center">
            <h4 className="lg:font-header text-text-lm lg:font-medium">Edit Profile</h4>
            <button type="button" onClick={onClose} className="cursor-pointer">
              <img src={crossBtnIcon} alt="Close modal" />
            </button>
          </div>

          <div className="flex flex-col gap-5 lg:mt-4">
            {profileSaveError && <p className="text-sm text-accent-lm">{profileSaveError}</p>}

            <div className="flex items-center gap-4">
              <div className="size-24 rounded-full overflow-hidden border border-stroke-grey bg-stroke-grey">
                <img
                  src={effectiveProfilePreviewUrl}
                  className="size-24 object-cover"
                  alt="Profile preview"
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-start">
                    <input
                      id="profile-image-file"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={onPickProfileFile}
                      className="hidden"
                    />
                    <label
                      htmlFor="profile-image-file"
                      className="px-4 py-2 rounded-md bg-accent-lm text-primary-lm text-sm disabled:opacity-50 cursor-pointer"
                    >
                      Choose file
                    </label>
                    {profileDraftFile?.name && (
                      <p className="mt-1 text-sm text-text-lighter-lm max-w-[20rem] wrap-break-word">
                        {profileDraftFile.name}
                      </p>
                    )}
                  </div>

                  {profilePictureUrl && !profileDraftFile && !profilePictureRemove && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfilePictureRemove(true);
                        setProfileDraftFile(null);
                      }}
                      className="text-sm text-accent-lm border border-accent-lm rounded-md px-3 py-2"
                    >
                      Remove current
                    </button>
                  )}
                </div>
                {profileFileError && <p className="text-sm text-accent-lm">{profileFileError}</p>}
                {profilePictureRemove && (
                  <p className="text-sm text-text-lighter-lm">Profile picture will be removed on Save.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-medium">Name</label>
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="w-full rounded-md border border-stroke-grey bg-primary-lm px-3 py-2"
                  placeholder="Your name"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-medium">Bio</label>
                <textarea
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value)}
                  className="w-full min-h-24 rounded-md border border-stroke-grey bg-primary-lm px-3 py-2"
                  placeholder="Write a short bio..."
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="font-medium">Contacts</label>
                  <button
                    type="button"
                    onClick={() => {
                      setContactsDraftError("");
                      setSelectedContactPlatformId("");
                      setContactPickerOpen(true);
                    }}
                    className="rounded-md border border-stroke-grey bg-primary-lm px-3 py-2 hover:bg-hover-lm"
                    aria-label="Add contact"
                    disabled={contactPlatformsLoading}
                  >
                    <LucidePlus className="size-5" />
                  </button>
                </div>

                {contactsDraftError && <p className="text-sm text-accent-lm">{contactsDraftError}</p>}
                {contactPlatformsError && (
                  <p className="text-sm text-accent-lm">{contactPlatformsError}</p>
                )}

                {!!contactsDraft.length && (
                  <div className="flex flex-col gap-2">
                    {contactsDraft.map((c) => {
                      const platformName =
                        contactPlatforms.find((p) => p.id === c.platformId)?.platform ??
                        contacts.find((x) => x.platformId === c.platformId)?.platform ??
                        "";

                      return (
                        <div
                          key={c.key}
                          className="flex items-center gap-2 rounded-md border border-stroke-grey bg-primary-lm px-3 py-2"
                        >
                          <img
                            src={getPlatformIconSrc(platformName)}
                            className="size-6"
                            alt={platformName ? `${platformName} icon` : "Platform icon"}
                          />
                          <input
                            value={c.contactLink}
                            onChange={(e) => {
                              const next = e.target.value;
                              setContactsDraft((prev) =>
                                prev.map((row) =>
                                  row.key === c.key ? { ...row, contactLink: next } : row
                                )
                              );
                            }}
                            className="flex-1 rounded-md border border-stroke-grey bg-primary-lm px-3 py-2"
                            placeholder="Enter URL"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setContactsDraft((prev) => prev.filter((row) => row.key !== c.key));
                              setSelectedContactPlatformId("");
                              setContactsDraftError("");
                            }}
                            className="rounded-full p-1 hover:bg-hover-lm"
                            aria-label="Remove contact"
                          >
                            <img src={crossBtnIcon} className="size-4" alt="Remove" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {contactPickerOpen && (
                  <div className="flex gap-2 items-center">
                    <select
                      value={selectedContactPlatformId}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setSelectedContactPlatformId(raw);
                        setContactsDraftError("");
                        const platformId = Number(raw);
                        if (!Number.isFinite(platformId)) return;

                        if (contactsDraft.some((c) => c.platformId === platformId)) {
                          setContactsDraftError("You already added this platform.");
                          setSelectedContactPlatformId("");
                          return;
                        }

                        setContactsDraft((prev) => [
                          ...prev,
                          { key: generateUuidV4(), platformId, contactLink: "" },
                        ]);

                        setSelectedContactPlatformId("");
                        setContactPickerOpen(false);
                      }}
                      className="rounded-md border border-stroke-grey bg-primary-lm px-3 py-2"
                      disabled={contactPlatformsLoading}
                    >
                      <option value="">Select platform…</option>
                      {contactPlatforms.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.platform}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md border border-stroke-grey bg-primary-lm"
                disabled={profileSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProfile}
                className="px-4 py-2 rounded-md bg-accent-lm text-primary-lm"
                disabled={profileSaving}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
