import imgIcon from "@/assets/images/fallbackImage.svg";
import docIcon from "@/assets/images/docsImg.svg";
import pdfIcon from "@/assets/images/pdfImage.svg";

import { useParams, useOutletContext } from "react-router";

import { getNotes, type Note } from "@/lib/studyMock";
import { placeholderUser } from "@/lib/placeholderUser";
import { ButtonCTA } from "@/components/ButtonCTA";
import { useState } from "react";
import { NotesAddModal } from "./NotesAddModal";

export function Notes() {
  const [openAddModal, setOpenAddModal]=useState(false);

  const { level, term } = useParams();
  const baseNotes: Note[] = getNotes(level, term);
  const outlet = useOutletContext<any>();
  const notes: Note[] = outlet?.filteredNotes ?? baseNotes;

  if (!notes.length) {
    // if filtering produced no results but base has items, show "Nothing found"
    if (outlet && outlet.baseNotes && outlet.baseNotes.length > 0) {
      return <h5 className="mt-10 text-text-lighter-lm ">Nothing found</h5>;
    }
    return <h5 className="mt-10 text-text-lighter-lm ">No notes for this term yet.</h5>;
  }

  return (
    <>
      <div className="flex flex-col gap-y-1 mt-10">
        <ButtonCTA label={"Add File"} clickEvent={()=>setOpenAddModal(true)}></ButtonCTA>
        <div className="grid grid-cols-3 gap-20 mt-8">
          {notes.map((n) => (
            <NoteItem key={n.id} {...n} />
          ))}
        </div>
      </div>

      {openAddModal && (
        <NotesAddModal
          onClose={() => setOpenAddModal(false)}
          onPost={(data) => {
            const id = `n_${Date.now()}`;
            const now = new Date();
            const newNote: Note = {
              id,
              title: data.title || "Untitled",
              uploadedBy: placeholderUser.name,
              courseCode:
                data.course && data.courseCode
                  ? `${data.course}-${data.courseCode}`
                  : data.courseCode || data.course || "",
              uploadDate: now.toLocaleDateString(),
              uploadTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              fileLink: data.file ? URL.createObjectURL(data.file) : data.fileLink ?? "",
              fileName: data.file?.name ?? (data.fileLink ? data.fileLink.split("/").pop() : undefined),
            };

            // call addNote from outlet context if provided, otherwise do nothing
            outlet?.addNote ? outlet.addNote(newNote) : null;
            setOpenAddModal(false);
          }}
        ></NotesAddModal>
      )}
    </>
  );
}


function NoteItem({title, uploadedBy, courseCode, uploadDate, uploadTime, fileLink, fileName }: Note) {
  const getExt = (s?: string) => s ? s.split(/[?#]/)[0].split('.').pop()?.toLowerCase() : undefined;
  const extension = getExt(fileName) ?? getExt(fileLink);
  let previewImage: string = imgIcon;

  if (extension === "jpg" || extension === "jpeg" || extension === "png" || extension === "webp" || extension === "svg")
    previewImage = imgIcon;
  else if(extension === "doc" || extension === "docx")
    previewImage = docIcon;
  else if (extension === "pdf")
    previewImage = pdfIcon;

  return (
    <a href={fileLink} target="_blank" rel="noopener noreferrer">
      <div className="flex flex-col w-70 h-90 rounded-xl bg-primary-lm hover:scale-102 transition duration-300 hover:drop-shadow-lg">
        <img src={previewImage} className="object-center object-contain w-full h-2/3 rounded-t-xl rounded-tl-xl" alt={title} />
        <div className="h-full w-full px-5 py-4 bg-linear-to-t from-[#DFE1E5] from-30% via-[#C3A99761] via-100% rounded-b-xl rounded-bl-xl">
          <p className="text-text-lm font-semibold text-md">{title}_{courseCode}</p>
          <p className="text-text-lm font-medium text-base">{uploadedBy}</p>
          <p className="text-text-lighter-lm text-base">Uploaded : {uploadDate} {uploadTime}</p>
        </div>
      </div>
    </a>
  );
}