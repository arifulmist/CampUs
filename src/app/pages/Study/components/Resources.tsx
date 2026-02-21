import { useOutletContext } from "react-router-dom";
import {
  type ResourceItem,
  createResource,
  deleteResource,
} from "../backend/studyService";
import { useState } from "react";
import { UserInfo } from "@/components/UserInfo";
import { ResourceAddModal } from "./ResourcesAddModal";
import { toast } from "react-hot-toast";
import notesEmptyState from "@/assets/images/noNotes.svg";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

export function Resources() {
  const outlet = useOutletContext<{
    filteredResources: ResourceItem[];
    baseResources: ResourceItem[];
    addResource: (r: ResourceItem) => void;
    removeResource: (resourceId: string) => void;
    loading: boolean;
    batch: string;
    level: number;
    term: number;
    currentUserId: string | null;
  }>();

  const resources = outlet?.filteredResources ?? [];
  const loading = outlet?.loading ?? false;
  const currentUserId = outlet?.currentUserId ?? null;

  const [openModal, setOpenModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingResourceId, setDeletingResourceId] = useState<string | null>(
    null,
  );

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
    } catch (err: unknown) {
      console.error("Error adding resource:", err);
      const message =
        err instanceof Error ? err.message : "Failed to add resource";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteResource(resourceId: string) {
    setDeletingResourceId(resourceId);
    try {
      await deleteResource(resourceId);
      outlet?.removeResource?.(resourceId);
      toast.success("Resource deleted successfully!");
    } catch (err: unknown) {
      console.error("Error deleting resource:", err);
      const message =
        err instanceof Error ? err.message : "Failed to delete resource";
      toast.error(message);
    } finally {
      setDeletingResourceId(null);
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
              <div className="flex flex-col items-center lg:gap-2">
                <img src={notesEmptyState} className="lg:size-50"></img>
                <h5 className="text-text-lighter-lm">
                  No resources for this term yet
                </h5>
              </div>
            )
          ) : (
            <div className="lg:space-y-4">
              {resources.map((r: ResourceItem) => (
                <Resource
                  key={r.id}
                  id={r.id}
                  authorId={r.authorId}
                  user={r.user}
                  title={r.title}
                  course={r.course}
                  resourceLink={r.resourceLink}
                  currentUserId={currentUserId}
                  onDelete={handleDeleteResource}
                  isDeleting={deletingResourceId === r.id}
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
  id: string;
  authorId?: string | null;
  user: {
    name: string;
    batch: string;
    imgURL: string | null;
  };
  title: string;
  course: string;
  resourceLink: string;
  currentUserId: string | null;
  onDelete: (resourceId: string) => void;
  isDeleting: boolean;
}

function Resource({
  id,
  authorId,
  user,
  title,
  course,
  resourceLink,
  currentUserId,
  onDelete,
  isDeleting,
}: ResourceProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isOwner = currentUserId != null && authorId === currentUserId;

  return (
    <div className="lg:relative lg:w-full lg:h-fit lg:p-10 bg-secondary-lm lg:border border-stroke-grey hover:bg-hover-lm lg:rounded-lg">
      <UserInfo
        userImg={user.imgURL || undefined}
        userName={user.name}
        userBatch={user.batch}
        userId={authorId ?? undefined}
      ></UserInfo>
      <p className="text-text-lm lg:mt-5">
        {course}_{title}
      </p>
      <a
        href={resourceLink}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent-lm hover:underline break-all"
      >
        {resourceLink}
      </a>
      {isOwner && (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-red-200 shadow-sm text-red-500 text-sm font-medium hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-md active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          aria-label="Delete resource"
        >
          {isDeleting ? (
            <>
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
              Deleting…
            </>
          ) : (
            <>
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
              Delete
            </>
          )}
        </button>
      )}
      <DeleteConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Resource"
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          await onDelete(id);
        }}
      />
    </div>
  );
}
