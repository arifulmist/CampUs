import imgIcon from "@/assets/images/fallbackImage.svg";
import docIcon from "@/assets/images/docsImg.svg";
import pdfIcon from "@/assets/images/pdfImage.svg";

import { useParams, useOutletContext } from "react-router";

import { getNotes, type Note } from "@/mockData/studyMock";
import { placeholderUser } from "@/mockData/placeholderUser";
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
      return <h5 className="lg:mt-10 text-text-lighter-lm">Nothing found</h5>;
    }
    return <h5 className="lg:mt-10 text-text-lighter-lm">No notes for this term yet.</h5>;
  }

  return (
    <>
      <div className="lg:flex lg:flex-col lg:gap-y-1 lg:mt-10">
        <ButtonCTA label={"Add File"} clickEvent={()=>setOpenAddModal(true)}></ButtonCTA>
        <div className="lg:grid lg:grid-cols-3 lg:gap-20 lg:mt-8">
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
      <div className="lg:flex lg:flex-col lg:w-70 lg:h-90 lg:rounded-xl bg-primary-lm hover:scale-102 lg:transition lg:duration-300 hover:drop-shadow-lg">
        <img src={previewImage} className="lg:object-center lg:object-contain lg:w-full lg:h-2/3 lg:rounded-t-xl lg:rounded-tl-xl" alt={title} />
        <div className="lg:h-full lg:w-full lg:px-5 lg:py-4 bg-linear-to-t from-[#DFE1E5] from-30% lg:via-[#C3A99761] lg:via-100% lg:rounded-b-xl lg:rounded-bl-xl">
          <p className="text-text-lm lg:font-semibold text-md">{title}_{courseCode}</p>
          <p className="text-text-lm lg:font-medium text-base">{uploadedBy}</p>
          <p className="text-text-lighter-lm text-base">Uploaded : {uploadDate} {uploadTime}</p>
        </div>
      </div>
    </a>
  );
}