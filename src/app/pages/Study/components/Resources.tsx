import { Link, useParams, useOutletContext } from "react-router";
import { getResources, type ResourceItem } from "@/lib/studyMock";
import { placeholderUser } from "@/lib/placeholderUser";
import { useState } from "react";
import { UserInfo } from "@/components/UserInfo";
import { ResourceAddModal } from "./ResourcesAddModal";

export function Resources() {
  const { level, term } = useParams();
  const baseResources = getResources(level, term);
  const outlet = useOutletContext<any>();
  const resources = outlet?.filteredResources ?? baseResources;

  const [openModal, setOpenModal] = useState(false);

  return (
    <>
      <div className="mt-10 w-full h-full p-10 bg-primary-lm border-2 border-stroke-grey rounded-lg">
        <button 
          onClick={()=>setOpenModal(true)}
          className="mb-5 w-full bg-primary-lm px-4 py-3 cursor-pointer text-accent-lm border border-stroke-grey rounded-lg text-start">
            Upload a Resource Link
        </button>
        <div className="w-full h-fit">
          {resources.length === 0 ? (
            // if filtering produced no results but base has items, show "Nothing found"
            outlet && outlet.baseResources && outlet.baseResources.length > 0 ? (
              <h5 className="text-text-lighter-lm">Nothing found</h5>
            ) : (
              <h5 className="text-text-lighter-lm">No resources for this term yet</h5>
            )
          ) : (
            <div className="space-y-4">
              {resources.map((r: ResourceItem) => (
                <Resource
                  key={r.resourceLink}
                  user={r.user}
                  title={r.title}
                  course={r.course}
                  resourceLink={r.resourceLink}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {openModal && (
        <ResourceAddModal
          onClose={() => setOpenModal(false)}
          onPost={(data) => {
            const id = `r_${Date.now()}`;
            const newResource = {
              user: { name: placeholderUser.name, batch: placeholderUser.batch, imgURL: placeholderUser.imgURL },
              title: data.title || "Untitled",
              course: data.course && data.courseCode ? `${data.course}-${data.courseCode}` : data.courseCode || data.course || "",
              resourceLink: data.resourceLink || "",
            };

            outlet?.addResource ? outlet.addResource(newResource) : null;
            setOpenModal(false);
          }}
        ></ResourceAddModal>
      )}
    </>
  );
}

interface ResourceProps
{
  user:{
    name: string,
    batch: string,
    imgURL: string
  },
  title:string,
  course:string,
  resourceLink:string
}

function Resource({user, title, course, resourceLink}:ResourceProps)
{
  return (
    <div className="w-full h-fit p-10 bg-secondary-lm border border-stroke-grey hover:bg-hover-lm rounded-lg">
      <UserInfo userImg={user.imgURL} userName={user.name} userBatch={user.batch} ></UserInfo>
      <p className="text-text-lm mt-5">{course}_{title}</p>
      <Link to={resourceLink} className="text-accent-lm hover:underline">{resourceLink}</Link>
    </div>
  );
}