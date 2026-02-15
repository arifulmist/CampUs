import crossBtnIcon from "@/assets/icons/cross_btn.svg";
import { useEffect, useState } from "react";

import {
  getErrorMessage,
  isAllowedImage,
  MAX_PROFILE_IMAGE_BYTES,
  uploadProfileImage,
  useObjectUrl,
} from "../userProfileUtils";
import { supabase } from "@/supabase/supabaseClient";

type Props = {
  open: boolean;
  canEdit: boolean;
  currentAuthUid: string | null;
  backgroundImgUrl: string | null;
  onClose: () => void;
  onBackgroundUpdated: (next: string | null) => void;
};

export function EditBackgroundModal({
  open,
  canEdit,
  currentAuthUid,
  backgroundImgUrl,
  onClose,
  onBackgroundUpdated,
}: Props) {
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>("");
  const [saveError, setSaveError] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const draftUrl = useObjectUrl(draftFile);
  const effectivePreviewUrl = draftUrl ?? backgroundImgUrl;

  useEffect(() => {
    if (!open) return;
    setDraftFile(null);
    setFileError("");
    setSaveError("");
  }, [open]);

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

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setFileError("Image must be 10MB or smaller.");
      setDraftFile(null);
      return;
    }
    if (!isAllowedImage(file)) {
      setFileError("Only PNG, JPG, and JPEG files are allowed.");
      setDraftFile(null);
      return;
    }
    setFileError("");
    setDraftFile(file);
  };

  const confirm = async () => {
    if (!canEdit) {
      setSaveError("You can only edit your own profile.");
      return;
    }

    if (!draftFile) return;

    setSaving(true);
    setSaveError("");

    try {
      let authUid = currentAuthUid;
      if (!authUid) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        authUid = userData.user?.id ?? null;
      }

      if (!authUid) {
        setSaveError("You need to be logged in to update this.");
        return;
      }

      const url = await uploadProfileImage(authUid, draftFile);

      const { error: upsertError } = await supabase
        .from("user_profile")
        .upsert({ auth_uid: authUid, background_img_url: url }, { onConflict: "auth_uid" });
      if (upsertError) throw upsertError;

      onBackgroundUpdated(url);
      onClose();
    } catch (e: unknown) {
      setSaveError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const removeCurrent = async () => {
    if (!canEdit) {
      setSaveError("You can only edit your own profile.");
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      let authUid = currentAuthUid;
      if (!authUid) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        authUid = userData.user?.id ?? null;
      }

      if (!authUid) {
        setSaveError("You need to be logged in to update this.");
        return;
      }

      const { error: upsertError } = await supabase
        .from("user_profile")
        .upsert({ auth_uid: authUid, background_img_url: null }, { onConflict: "auth_uid" });
      if (upsertError) throw upsertError;

      onBackgroundUpdated(null);
      onClose();
    } catch (e: unknown) {
      setSaveError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-100 bg-[rgba(0,0,0,0.4)]"
        onMouseDown={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-101">
        <div
          className="bg-secondary-lm border-2 border-stroke-grey lg:rounded-xl lg:px-8 lg:py-6 lg:w-130 lg:relative lg:animate-slide-in max-h-[85vh] overflow-y-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="lg:flex lg:justify-between lg:items-center">
            <h4 className="lg:font-header text-text-lm lg:font-medium">Edit Background Image</h4>
            <button type="button" onClick={onClose} className="cursor-pointer">
              <img src={crossBtnIcon} alt="Close modal" />
            </button>
          </div>

          <div className="flex flex-col gap-4 lg:mt-4">
            {saveError && <p className="text-sm text-accent-lm">{saveError}</p>}

            <div
              className="w-full h-56 rounded-xl border border-stroke-grey bg-stroke-grey overflow-hidden"
              style={
                effectivePreviewUrl
                  ? {
                      backgroundImage: `url(${effectivePreviewUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            />

            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-start">
                  <input
                    id="background-image-file"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={onPickFile}
                    className="hidden"
                  />
                  <label
                    htmlFor="background-image-file"
                    className="lg:px-4 lg:py-2 lg:rounded-md bg-accent-lm text-primary-lm disabled:opacity-50 hover:bg-hover-btn-lm transition duration-150 cursor-pointer"
                  >
                    Choose file
                  </label>
                  {draftFile?.name && (
                    <p className="lg:mt-1 text-sm text-text-lighter-lm max-w-[20rem] wrap-break-word">
                      {draftFile.name}
                    </p>
                  )}
                </div>

                {backgroundImgUrl && !draftFile && (
                  <button
                    type="button"
                    onClick={removeCurrent}
                    className="lg:px-4 lg:py-2 lg:rounded-md border border-accent-lm text-accent-lm bg-primary-lm hover:bg-stroke-grey/20 transition duration-150 cursor-pointer"
                    disabled={saving}
                  >
                    Remove current
                  </button>
                )}
              </div>

              {fileError && <p className="text-sm text-accent-lm">{fileError}</p>}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="lg:px-4 lg:py-2 lg:rounded-md border text-text-lighter-lm/70 border-stroke-grey bg-primary-lm hover:bg-stroke-grey/40 transition duration-150 cursor-pointer"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={!draftFile || saving}
                className="px-4 py-2 rounded-md bg-accent-lm text-primary-lm hover:bg-hover-btn-lm transition duration-150 disabled:opacity-50 cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
