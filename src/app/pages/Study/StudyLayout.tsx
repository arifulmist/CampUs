import { NavLink, Outlet, useParams, useLocation } from "react-router";
import { Sidebar } from "./components/Sidebar";
import { useMemo, useState, useEffect } from "react";
import { placeholderUser } from "@/mockData/placeholderUser";
import {
  fetchNotes,
  fetchResources,
  type Note,
  type ResourceItem,
} from "./backend/studyService";

export function StudyLayout() {
  const { level, term } = useParams();
  const batch = placeholderUser.batch;

  const notesPath = `/study/${level}/${term}/notes`;
  const resourcesPath = `/study/${level}/${term}/resources`;

  const [notes, setNotes] = useState<Note[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const viewingResources = location.pathname.includes("/resources");

  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedUploader, setSelectedUploader] = useState<string | null>(null);

  // Fetch data from backend when level/term changes
  useEffect(() => {
    setSelectedCourse(null);
    setSelectedUploader(null);
    setLoading(true);

    const levelNum = parseInt(level || "1", 10);
    const termNum = parseInt(term || "1", 10);

    Promise.all([
      fetchNotes(batch, levelNum, termNum),
      fetchResources(batch, levelNum, termNum),
    ])
      .then(([notesData, resourcesData]) => {
        setNotes(notesData);
        setResources(resourcesData);
      })
      .catch((err) => {
        console.error("Error fetching study data:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [level, term, batch]);

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
      const courseMatch = selectedCourse
        ? n.courseCode === selectedCourse
        : true;
      const uploaderMatch = selectedUploader
        ? n.uploadedBy === selectedUploader
        : true;
      return courseMatch && uploaderMatch;
    });
  }, [notes, selectedCourse, selectedUploader]);

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      const courseMatch = selectedCourse ? r.course === selectedCourse : true;
      const uploaderMatch = selectedUploader
        ? r.user.name === selectedUploader
        : true;
      return courseMatch && uploaderMatch;
    });
  }, [resources, selectedCourse, selectedUploader]);

  function addNote(n: Note) {
    setNotes((prev) => [n, ...prev]);
  }

  function addResource(r: ResourceItem) {
    setResources((prev) => [r, ...prev]);
  }

  return (
    <main className="lg:w-full lg:h-screen lg:flex">
      <Sidebar batch={batch} />
      <div className="lg:w-full lg:h-full lg:flex lg:flex-col lg:ml-[20vw] lg:px-10 lg:animate-slide-in">
        <div className="lg:flex lg:w-full lg:gap-5 lg:justify-center lg:mt-6">
          <TabLink linktxt="Notes" dest={notesPath} />
          <TabLink linktxt="Resources" dest={resourcesPath} />
        </div>
        <div className="lg:mt-6 lg:flex lg:flex-row lg:gap-x-4">
          <p className="text-accent-lm lg:font-medium">Filter by</p>
          {(() => {
            return (
              <>
                <select
                  name="course"
                  id="course"
                  value={selectedCourse ?? "Course"}
                  onChange={(e) =>
                    setSelectedCourse(
                      e.target.value === "Course" ? null : e.target.value,
                    )
                  }
                  className="bg-primary-lm lg:border border-stroke-grey lg:rounded-sm lg:px-2 lg:py-0.5 text-stroke-peach focus:border focus:border-stroke-peach"
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
                  onChange={(e) =>
                    setSelectedUploader(
                      e.target.value === "Uploaded by" ? null : e.target.value,
                    )
                  }
                  className="bg-primary-lm lg:border border-stroke-grey lg:rounded-sm lg:px-2 lg:py-0.5 text-stroke-peach"
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
                  className="lg:ml-2 lg:px-3 lg:py-1 lg:rounded bg-secondary-lm text-accent-lm lg:border border-stroke-grey cursor-pointer hover:bg-stroke-grey lg:transition"
                >
                  Reset
                </button>
              </>
            );
          })()}
        </div>
        <div className="lg:flex lg:flex-col lg:items-center">
          <Outlet
            context={{
              filteredNotes,
              filteredResources,
              baseNotes: notes,
              baseResources: resources,
              viewingResources,
              addNote,
              addResource,
              loading,
              batch,
              level: parseInt(level || "1", 10),
              term: parseInt(term || "1", 10),
            }}
          />
        </div>
      </div>
    </main>
  );
}

function TabLink({ linktxt, dest }: { linktxt: string; dest: string }) {
  return (
    <NavLink
      to={dest}
      className={({ isActive }) =>
        [
          "px-3 py-2 rounded-md font-medium text-center h-fit w-fit",
          isActive
            ? "bg-accent-lm text-primary-lm hover:bg-hover-btn-lm transition"
            : "bg-primary-lm text-accent-lm border border-stroke-grey hover:bg-hover-lm transition",
        ].join(" ")
      }
    >
      {linktxt}
    </NavLink>
  );
}
