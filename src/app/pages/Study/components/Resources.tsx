import { Link, useOutletContext } from "react-router";
import { type ResourceItem, createResource } from "../backend/studyService";
import { useState } from "react";
import { UserInfo } from "@/components/UserInfo";
import { ResourceAddModal } from "./ResourcesAddModal";
import { toast } from "react-hot-toast";

export function Resources() {
  const outlet = useOutletContext<{
    filteredResources: ResourceItem[];
    baseResources: ResourceItem[];
    addResource: (r: ResourceItem) => void;
    loading: boolean;
    batch: string;
    level: number;
    term: number;
  }>();

  const resources = outlet?.filteredResources ?? [];
  const loading = outlet?.loading ?? false;

  const [openModal, setOpenModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAddResource(data: {
    title: string;
    course: string;
    courseCode: string;
    resourceLink: string;
  }) {
    if (!data.resourceLink) {
      toast.error("Please provide a resource link");
      return;
    }

    setIsSubmitting(true);
    try {
      const newResource = await createResource({
        batchName: outlet.batch,
        level: outlet.level,
        term: outlet.term,
        title: data.title || "Untitled",
        course: data.course || "GEN",
        courseCode: data.courseCode || "100",
        resourceLink: data.resourceLink,
      });

      outlet?.addResource?.(newResource);
      toast.success("Resource added successfully!");
      setOpenModal(false);
    } catch (err: any) {
      console.error("Error adding resource:", err);
      toast.error(err.message || "Failed to add resource");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="lg:mt-10 lg:w-full lg:h-full lg:p-10 bg-primary-lm border-2 border-stroke-grey lg:rounded-lg">
        <button
          onClick={() => setOpenModal(true)}
          className="lg:mb-5 lg:w-full bg-primary-lm lg:px-4 lg:py-3 cursor-pointer text-accent-lm lg:border border-stroke-grey lg:rounded-lg text-start"
        >
          Upload a Resource Link
        </button>
        <div className="lg:w-full lg:h-fit">
          {loading ? (
            <h5 className="text-text-lighter-lm">Loading resources...</h5>
          ) : resources.length === 0 ? (
            outlet &&
            outlet.baseResources &&
            outlet.baseResources.length > 0 ? (
              <h5 className="text-text-lighter-lm">Nothing found</h5>
            ) : (
              <h5 className="text-text-lighter-lm">
                No resources for this term yet
              </h5>
            )
          ) : (
            <div className="lg:space-y-4">
              {resources.map((r: ResourceItem) => (
                <Resource
                  key={r.id}
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
          onPost={handleAddResource}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
}

interface ResourceProps {
  user: {
    name: string;
    batch: string;
    imgURL: string;
  };
  title: string;
  course: string;
  resourceLink: string;
}

function Resource({ user, title, course, resourceLink }: ResourceProps) {
  return (
    <div className="lg:w-full lg:h-fit lg:p-10 bg-secondary-lm lg:border border-stroke-grey hover:bg-hover-lm lg:rounded-lg">
      <UserInfo
        userImg={user.imgURL}
        userName={user.name}
        userBatch={user.batch}
      ></UserInfo>
      <p className="text-text-lm lg:mt-5">
        {course}_{title}
      </p>
      <Link to={resourceLink} className="text-accent-lm hover:underline">
        {resourceLink}
      </Link>
    </div>
  );
}
