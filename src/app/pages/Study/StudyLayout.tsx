import { NavLink, Outlet, useParams, useLocation } from "react-router";
import { Sidebar } from "./components/Sidebar";
import { getNotes, getResources, type Note, type ResourceItem } from "@/lib/studyMock";
import { useMemo, useState, useEffect } from "react";
import { placeholderUser } from "@/lib/placeholderUser";

export function StudyLayout() {
  const { level, term } = useParams();
  const batch = placeholderUser.batch;

  const notesPath = `/study/${level}/${term}/notes`;
  const resourcesPath = `/study/${level}/${term}/resources`;
  
  const [notes, setNotes] = useState<Note[]>(() => getNotes(level, term));
  const [resources, setResources] = useState<ResourceItem[]>(() => getResources(level, term));
  const location = useLocation();
  const viewingResources = location.pathname.includes("/resources");

  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedUploader, setSelectedUploader] = useState<string | null>(null);

  useEffect(() => {
    // Reset filters when navigating to a different level/term
    setSelectedCourse(null);
    setSelectedUploader(null);
    // reload base data for new level/term
    setNotes(getNotes(level, term));
    setResources(getResources(level, term));
  }, [level, term]);

  const courses = useMemo(() => {
    return viewingResources
      ? Array.from(new Set(resources.map((r) => r.course)))
      : Array.from(new Set(notes.map((n) => n.courseCode)));
  }, [viewingResources, resources, notes]);

  const uploaders = useMemo(() => {
    return viewingResources
      ? Array.from(new Set(resources.map((r) => r.user.name)))
      : Array.from(new Set(notes.map((n) => n.uploadedBy)));
  }, [viewingResources, resources, notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const courseMatch = selectedCourse ? n.courseCode === selectedCourse : true;
      const uploaderMatch = selectedUploader ? n.uploadedBy === selectedUploader : true;
      return courseMatch && uploaderMatch;
    });
  }, [notes, selectedCourse, selectedUploader]);

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      const courseMatch = selectedCourse ? r.course === selectedCourse : true;
      const uploaderMatch = selectedUploader ? r.user.name === selectedUploader : true;
      return courseMatch && uploaderMatch;
    });
  }, [resources, selectedCourse, selectedUploader]);

  function addNote(n: Note) {
    setNotes((prev) => [n, ...prev]);
  }

  function addResource(r: ResourceItem) {
    setResources((prev) => [r, ...prev]);
  }
  
  return(
    <main className="w-full h-screen flex ">
      <Sidebar batch={batch} />
      <div className="w-full h-full flex flex-col ml-[20vw] px-10 animate-slide-in">
        <div className="flex w-full gap-5 justify-center mt-6">
          <TabLink linktxt="Notes" dest={notesPath} />
          <TabLink linktxt="Resources" dest={resourcesPath} />
        </div>
        <div className="mt-6 flex flex-row gap-x-4">
          <p className="text-accent-lm font-medium">Filter by</p>
          {(() => {
            return (
              <>
                <select
                  name="course"
                  id="course"
                  value={selectedCourse ?? "Course"}
                  onChange={(e) => setSelectedCourse(e.target.value === "Course" ? null : e.target.value)}
                  className="bg-primary-lm border border-stroke-grey rounded-sm px-2 py-0.5 text-stroke-peach focus:border focus:border-stroke-peach"
                >
                  <option value={"Course"} disabled>
                    Course
                  </option>
                  {courses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  name="uploadedby"
                  id="uploadedby"
                  value={selectedUploader ?? "Uploaded by"}
                  onChange={(e) => setSelectedUploader(e.target.value === "Uploaded by" ? null : e.target.value)}
                  className="bg-primary-lm border border-stroke-grey rounded-sm px-2 py-0.5 text-stroke-peach"
                >
                  <option value={"Uploaded by"} disabled>
                    Uploaded by
                  </option>
                  {uploaders.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setSelectedCourse(null);
                    setSelectedUploader(null);
                  }}
                  className="ml-2 px-3 py-1 rounded bg-secondary-lm text-accent-lm border border-stroke-grey cursor-pointer hover:bg-stroke-grey transition"
                >
                  Reset
                </button>
              </>
            );
          })()}
        </div>
        <div className="flex flex-col items-center">
          <Outlet context={{
            filteredNotes,
            filteredResources,
            baseNotes: notes,
            baseResources: resources,
            viewingResources,
            addNote,
            addResource,
          }} />
        </div>
      </div>
    </main>
  );
}

function TabLink({ linktxt, dest }: { linktxt: string; dest: string }) 
{
  return (
    <NavLink
      to={dest}
      className={({ isActive }) => [
        "px-3 py-2 rounded-md font-medium text-center h-fit w-fit",
        isActive
          ? "bg-accent-lm text-primary-lm hover:bg-hover-btn-lm transition"
          : "bg-primary-lm text-accent-lm border border-stroke-grey hover:bg-hover-lm transition",
      ].join(" ")}
    >
      {linktxt}
    </NavLink>
  );
}
