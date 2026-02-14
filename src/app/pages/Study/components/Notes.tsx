import imgIcon from "@/assets/images/fallbackImage.svg";
import docIcon from "@/assets/images/docsImg.svg";
import pdfIcon from "@/assets/images/pdfImage.svg";

import { useOutletContext } from "react-router";

import { type Note, createNote, uploadNoteFile } from "../backend/studyService";
import { ButtonCTA } from "@/components/ButtonCTA";
import { useState } from "react";
import { NotesAddModal } from "./NotesAddModal";
import { toast } from "react-hot-toast";

export function Notes() {
  const [openAddModal, setOpenAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const outlet = useOutletContext<{
    filteredNotes: Note[];
    baseNotes: Note[];
    addNote: (n: Note) => void;
    loading: boolean;
    batch: string;
    level: number;
    term: number;
  }>();

  const notes: Note[] = outlet?.filteredNotes ?? [];
  const loading = outlet?.loading ?? false;

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

  function renderContent() {
    if (loading) {
      return <h5 className="text-text-lighter-lm">Loading notes...</h5>;
    }
    if (!notes.length) {
      if (outlet && outlet.baseNotes && outlet.baseNotes.length > 0) {
        return <h5 className="text-text-lighter-lm">Nothing found</h5>;
      }
      return (
        <h5 className="text-text-lighter-lm">No notes for this term yet.</h5>
      );
    }
    return (
      <div className="lg:grid lg:grid-cols-3 lg:gap-20 lg:mt-8">
        {notes.map((n) => (
          <NoteItem key={n.id} {...n} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="lg:flex lg:flex-col lg:gap-y-1 lg:mt-10">
        <ButtonCTA
          label={"Add File"}
          clickEvent={() => setOpenAddModal(true)}
        ></ButtonCTA>
        {renderContent()}
      </div>

      {openAddModal && (
        <NotesAddModal
          onClose={() => setOpenAddModal(false)}
          onPost={handleAddNote}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
}

function NoteItem({
  title,
  uploadedBy,
  courseCode,
  uploadDate,
  uploadTime,
  fileLink,
  fileName,
}: Note) {
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

  return (
    <a href={fileLink} target="_blank" rel="noopener noreferrer">
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
          <p className="text-text-lm lg:font-medium text-base">{uploadedBy}</p>
          <p className="text-text-lighter-lm text-base">
            Uploaded : {uploadDate} {uploadTime}
          </p>
        </div>
      </div>
    </a>
  );
}
