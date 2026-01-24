import { Link, useParams, useOutletContext } from "react-router";
import { getResources, type ResourceItem } from "@/mockData/studyMock";
import { placeholderUser } from "@/mockData/placeholderUser";
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
      <div className="lg:mt-10 lg:w-full lg:h-full lg:p-10 bg-primary-lm border-2 border-stroke-grey lg:rounded-lg">
        <button 
          onClick={()=>setOpenModal(true)}
          className="lg:mb-5 lg:w-full bg-primary-lm lg:px-4 lg:py-3 cursor-pointer text-accent-lm lg:border border-stroke-grey lg:rounded-lg text-start">
            Upload a Resource Link
        </button>
        <div className="lg:w-full lg:h-fit">
          {resources.length === 0 ? (
            // if filtering produced no results but base has items, show "Nothing found"
            outlet && outlet.baseResources && outlet.baseResources.length > 0 ? (
              <h5 className="text-text-lighter-lm">Nothing found</h5>
            ) : (
              <h5 className="text-text-lighter-lm">No resources for this term yet</h5>
            )
          ) : (
            <div className="lg:space-y-4">
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
    <div className="lg:w-full lg:h-fit lg:p-10 bg-secondary-lm lg:border border-stroke-grey hover:bg-hover-lm lg:rounded-lg">
      <UserInfo userImg={user.imgURL} userName={user.name} userBatch={user.batch} ></UserInfo>
      <p className="text-text-lm lg:mt-5">{course}_{title}</p>
      <Link to={resourceLink} className="text-accent-lm hover:underline">{resourceLink}</Link>
    </div>
  );
}