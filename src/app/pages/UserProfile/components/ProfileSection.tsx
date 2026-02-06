import { LucidePencil } from "lucide-react";
import { useMemo, useState } from "react";

import { useUserProfileContext } from "./UserProfileContext";
import {
  displayContactLinkText,
  getPlatformIconSrc,
  normalizePlatform,
  PLACEHOLDER_USER_IMG,
  toExternalContactHref,
  useObjectUrl,
} from "../userProfileUtils";
import { EditBackgroundModal } from "./EditBackgroundModal";
import { EditProfileModal } from "./EditProfileModal";

export function ProfileSection() {
  const {
    canEdit,
    currentAuthUid,
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
    setBackgroundImgUrl,
    setBio,
    setContacts,
    setDisplayName,
    setProfilePictureUrl,
  } = useUserProfileContext();

  const [backgroundModalOpen, setBackgroundModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const profileImageUrl = useObjectUrl(profileImageFile);

  const effectiveAvatarUrl = useMemo(() => {
    return profileImageUrl ?? profilePictureUrl ?? PLACEHOLDER_USER_IMG;
  }, [profileImageUrl, profilePictureUrl]);

  return (
    <>
      <div className="bg-primary-lm border border-stroke-grey lg:rounded-xl flex flex-col h-fit">
        <div
          className="w-full h-[30vh] bg-stroke-grey rounded-t-xl relative overflow-hidden"
          style={
            backgroundImgUrl
              ? {
                  backgroundImage: `url(${backgroundImgUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {canEdit && (
            <button
              type="button"
              onClick={() => setBackgroundModalOpen(true)}
              aria-label="Edit background image"
              className="absolute lg:top-3 lg:right-3 rounded-full bg-primary-lm hover:bg-secondary-lm transition lg:p-2 border border-stroke-grey cursor-pointer"
            >
              <LucidePencil className="size-5" />
            </button>
          )}
        </div>

        <div className="flex flex-col lg:ml-8">

          <div className="rounded-full lg:size-35 lg:mb-4 border-3 border-primary-lm lg:-mt-20 relative">
            <img src={effectiveAvatarUrl} className="object-cover lg:size-35 rounded-full" alt="Profile" />
            {canEdit && (
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                aria-label="Edit profile"
                className="absolute lg:top-2 lg:-right-1 rounded-full bg-primary-lm hover:bg-secondary-lm transition lg:p-1.5 border border-stroke-grey cursor-pointer"
              >
                <LucidePencil className="size-5" />
              </button>
            )}
          </div>

          <h3 className="font-header">{displayName}</h3>
          {!!studentId && <h6>{studentId}</h6>}
          {!!batchLabel && <h6>{batchLabel}</h6>}
          {!!bio && <p className="lg:my-3">{bio}</p>}

          <div className="flex lg:gap-3 flex-wrap lg:mb-5">
            {contacts
              .filter((c) => c.contactLink.trim())
              .map((c, idx) => {
                const href = toExternalContactHref(c.platform, c.contactLink);
                const isEmail = normalizePlatform(c.platform) === "email";

                return (
                  <a
                    key={`${c.platformId}-${c.contactLink}-${idx}`}
                    href={href}
                    target={isEmail ? undefined : "_blank"}
                    rel={isEmail ? undefined : "noreferrer"}
                    className="flex lg:gap-2 items-center hover:opacity-80"
                    aria-label={c.platform ? `${c.platform} contact` : "Contact"}
                  >
                    <img src={getPlatformIconSrc(c.platform)} className="size-8" alt="Contact" />
                    <p className="max-w-[18rem] truncate">{displayContactLinkText(href)}</p>
                  </a>
                );
              })}
          </div>
        </div>
      </div>

      <EditBackgroundModal
        open={backgroundModalOpen}
        canEdit={canEdit}
        currentAuthUid={currentAuthUid}
        backgroundImgUrl={backgroundImgUrl}
        onClose={() => setBackgroundModalOpen(false)}
        onBackgroundUpdated={(next) => setBackgroundImgUrl(next)}
      />

      <EditProfileModal
        open={profileModalOpen}
        canEdit={canEdit}
        currentAuthUid={currentAuthUid}
        displayName={displayName}
        bio={bio}
        profilePictureUrl={profilePictureUrl}
        contacts={contacts}
        contactPlatforms={contactPlatforms}
        contactPlatformsLoading={contactPlatformsLoading}
        contactPlatformsError={contactPlatformsError}
        onClose={() => setProfileModalOpen(false)}
        onSaved={(next) => {
          setDisplayName(next.displayName);
          setBio(next.bio);
          setProfilePictureUrl(next.profilePictureUrl);
          setContacts(next.contacts);
          if (next.savedDraftFile) setProfileImageFile(next.savedDraftFile);
        }}
      />
    </>
  );
}
