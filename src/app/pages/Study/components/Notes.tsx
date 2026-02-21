import imgIcon from "@/assets/images/fallbackImage.svg";
import docIcon from "@/assets/images/docsImg.svg";
import pdfIcon from "@/assets/images/pdfImage.svg";

import { useOutletContext } from "react-router";
import { supabase } from "@/supabase/supabaseClient";

import {
  type Note,
  createNote,
  uploadNoteFile,
  deleteNote,
  computeFileHash,
  checkDuplicateNote,
} from "../backend/studyService";
import { ButtonCTA } from "@/components/ButtonCTA";
import { useState } from "react";
import { NotesAddModal } from "./NotesAddModal";
import { toast } from "react-hot-toast";
import notesEmptyState from "@/assets/images/noNotes.svg";

export function Notes() {
  const [openAddModal, setOpenAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const outlet = useOutletContext<{
    filteredNotes: Note[];
    baseNotes: Note[];
    addNote: (n: Note) => void;
    removeNote: (noteId: string) => void;
    loading: boolean;
    batch: string;
    level: number;
    term: number;
    currentUserId: string | null;
  }>();

  const notes: Note[] = outlet?.filteredNotes ?? [];
  const loading = outlet?.loading ?? false;
  const currentUserId = outlet?.currentUserId ?? null;

  async function handleAddNote(data: {
    title: string;
    course: string;
    courseCode: string;
    file: File | null;
    fileLink?: string | null;
  }) {
    if (!data.file) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsSubmitting(true);
    try {
      // Compute file hash and check for duplicates before uploading
      const fileHash = await computeFileHash(data.file);
      const duplicate = await checkDuplicateNote(fileHash);

      if (duplicate) {
        toast.error(
          `Duplicate file detected! "${duplicate.title}" (${duplicate.courseCode}) uploaded by ${duplicate.uploadedBy} has identical content.`,
          { duration: 6000 },
        );
        setIsSubmitting(false);
        return;
      }

      // Upload file first
      const fileUrl = await uploadNoteFile(data.file);

      // Create note in database
      const newNote = await createNote({
        batchName: outlet.batch,
        level: outlet.level,
        term: outlet.term,
        title: data.title || "Untitled",
        course: data.course || "GEN",
        courseCode: data.courseCode || "100",
        fileUrl,
        fileHash,
      });

      // Update local state
      outlet?.addNote?.(newNote);
      toast.success("Note uploaded successfully!");
      setOpenAddModal(false);
    } catch (err: any) {
      console.error("Error adding note:", err);
      toast.error(err.message || "Failed to upload note");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    setDeletingNoteId(noteId);
    try {
      await deleteNote(noteId);
      outlet?.removeNote?.(noteId);
      toast.success("Note deleted successfully!");
    } catch (err: any) {
      console.error("Error deleting note:", err);
      toast.error(err.message || "Failed to delete note");
    } finally {
      setDeletingNoteId(null);
    }
  }

  function renderContent() {
    if (loading) {
      return <h5 className="text-text-lighter-lm">Loading notes...</h5>;
    }
    if (!notes.length) {
      if (outlet && outlet.baseNotes && outlet.baseNotes.length > 0) {
        return <h5 className="text-text-lighter-lm">Nothing found</h5>;
      }
      return (
        <div className="flex flex-col items-center lg:gap-2">
          <img src={notesEmptyState} className="lg:size-50"></img>
          <h5 className="text-text-lighter-lm">No notes for this term yet</h5>
        </div>
      );
    }
    return (
      <div className="lg:grid lg:grid-cols-3 lg:gap-20 lg:mt-8">
        {notes.map((n) => (
          <NoteItem
            key={n.id}
            {...n}
            currentUserId={currentUserId}
            onDelete={handleDeleteNote}
            isDeleting={deletingNoteId === n.id}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full lg:mt-4">
        <ButtonCTA
          label={"Add File"}
          clickEvent={() => setOpenAddModal(true)}
        ></ButtonCTA>
      </div>
      <div className="lg:flex lg:flex-col items-center gap-y-1 mt-10">
        {renderContent()}
      </div>

      {openAddModal && (
        <NotesAddModal
          onClose={() => setOpenAddModal(false)}
          onPost={handleAddNote}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

function NoteItem({
  id,
  title,
  uploadedBy,
  courseCode,
  uploadDate,
  uploadTime,
  fileLink,
  fileName,
  authorId,
  currentUserId,
  onDelete,
  isDeleting,
}: Note & {
  currentUserId: string | null;
  onDelete: (noteId: string) => void;
  isDeleting: boolean;
}) {
  const getExt = (s?: string) =>
    s ? s.split(/[?#]/)[0].split(".").pop()?.toLowerCase() : undefined;
  const extension = getExt(fileName) ?? getExt(fileLink);
  let previewImage: string = imgIcon;

  if (
    extension === "jpg" ||
    extension === "jpeg" ||
    extension === "png" ||
    extension === "webp" ||
    extension === "svg"
  )
    previewImage = imgIcon;
  else if (extension === "doc" || extension === "docx") previewImage = docIcon;
  else if (extension === "pdf") previewImage = pdfIcon;

  async function extractObjectPath(url?: string) {
    if (!url) return null;
    try {
      const u = new URL(url);
      // Try to find /storage/v1/object/(public/)?<bucket>/path
      const parts = u.pathname.split("/storage/v1/object/");
      if (parts.length === 2) {
        // parts[1] = maybe "public/notes/...." or "notes/..."
        let after = parts[1];
        // remove possible "public/"
        after = after.replace(/^public\//, "");
        // if the path includes the bucket name (e.g. "notes/..."), remove it so
        // createSignedUrl receives the object path relative to the bucket root
        if (after.startsWith("notes/")) return after.slice("notes/".length);
        return after;
      }
    } catch (e) {
      // fallback: try to locate /notes/ in the URL
      const idx = url.indexOf("/notes/");
      if (idx !== -1) return url.substring(idx + "/notes/".length);
    }
    return null;
  }

  async function openFile(e: React.MouseEvent) {
    e.preventDefault();
    if (!fileLink) {
      toast.error("No file link available");
      return;
    }

    // Try the public URL first
    try {
      const res = await fetch(fileLink, { method: "GET" });
      if (res.ok) {
        window.open(fileLink, "_blank", "noopener,noreferrer");
        return;
      }
      // Not ok -> fallthrough to signed URL
    } catch (err) {
      // network/CORS/etc. -> try signed URL fallback
    }

    const objectPath = await extractObjectPath(fileLink);
    if (!objectPath) {
      toast.error("Failed to determine storage path for this file");
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from("notes")
        .createSignedUrl(objectPath, 60);
      if (error) throw error;
      const signedUrl = data.signedUrl ?? (data?.signedURL || data?.signed_url);
      if (!signedUrl) throw new Error("Failed to obtain signed URL");
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      console.error("Signed URL error:", err);
      toast.error(err?.message ?? "Unable to open file. Contact admin.");
    }
  }

  const isOwner = currentUserId != null && authorId === currentUserId;

  return (
    <div className="relative lg:w-70">
      <button
        onClick={openFile}
        className="w-full text-left"
        aria-label={`Open ${title}`}
      >
        <div className="lg:flex lg:flex-col lg:w-70 lg:h-90 lg:rounded-xl bg-primary-lm hover:scale-102 lg:transition lg:duration-300 hover:drop-shadow-lg">
          <img
            src={previewImage}
            className="lg:object-center lg:object-contain lg:w-full lg:h-2/3 lg:rounded-t-xl lg:rounded-tl-xl"
            alt={title}
          />
          <div className="lg:h-full lg:w-full lg:px-5 lg:py-4 bg-linear-to-t from-[#DFE1E5] from-30% lg:via-[#C3A99761] lg:via-100% lg:rounded-b-xl lg:rounded-bl-xl">
            <p className="text-text-lm lg:font-semibold text-md">
              {title}_{courseCode}
            </p>
            <p className="text-text-lm lg:font-medium text-base">
              {uploadedBy}
            </p>
            <p className="text-text-lighter-lm text-base">
              Uploaded : {uploadDate} {uploadTime}
            </p>
          </div>
        </div>
      </button>
      {isOwner && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
          disabled={isDeleting}
          className="absolute top-2 right-2 z-10 size-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm border border-stroke-grey shadow-md text-red-500 hover:bg-red-600 hover:text-white hover:shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          aria-label="Delete note"
          title="Delete this note"
        >
          {isDeleting ? (
            <svg
              className="animate-spin size-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="size-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
