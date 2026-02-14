import { useState } from "react";
import { InputField } from "@/components/InputField";
import crossBtn from "@/assets/icons/cross_btn.svg";
import warningIcon from "@/assets/icons/warning_icon.png";

interface ResourceAddModalProps {
  onClose: () => void;
  onPost?: (data: {
    title: string;
    course: string;
    courseCode: string;
    resourceLink: string;
  }) => void;
  isSubmitting?: boolean;
}

export function ResourceAddModal({
  onClose,
  onPost,
  isSubmitting = false,
}: ResourceAddModalProps) {
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [resourceLink, setResourceLink] = useState("");

  const [courseCodeError, setCourseCodeError] = useState("");

  function handleCourseCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;

    if (!/^\d*$/.test(value)) {
      setCourseCodeError("Only numbers are allowed");
      return;
    } else if (value.length > 3) {
      setCourseCodeError("Course code can have max 3 digits");
      return;
    } else {
      setCourseCodeError("");
    }

    setCourseCode(value);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    onPost?.({
      title,
      course,
      courseCode,
      resourceLink,
    });
    // Note: onClose is called by parent component after successful submission
  }

  return (
    <>
      {/* Backdrop */}
      <div className="lg:fixed lg:inset-0 bg-[#cbcbcb95] lg:z-50" />

      {/* Modal */}
      <div className="lg:fixed lg:inset-0 lg:z-50 lg:flex lg:items-center lg:justify-center">
        <form
          onSubmit={handleSubmit}
          className="bg-secondary-lm border-2 border-stroke-grey lg:rounded-xl lg:px-10 lg:py-8 lg:w-130 lg:relative lg:animate-slide-in"
        >
          {/* Header */}
          <div className="lg:flex lg:justify-between lg:items-center">
            <h4 className="lg:font-header text-text-lm lg:font-medium">
              Add Resource
            </h4>
            <button type="button" onClick={onClose} className="cursor-pointer">
              <img src={crossBtn} alt="Close modal" />
            </button>
          </div>

          {/* Fields */}
          <div
            className="lg:mt-4 lg:flex lg:flex-col lg:gap-4"
            onFocusCapture={() => setCourseCodeError("")}
          >
            <InputField
              label="Title"
              name="title"
              type="text"
              value={title}
              changeHandler={(e) => setTitle(e.target.value)}
            />

            <div className="lg:flex lg:justify-between">
              <InputField
                label="Course"
                name="course"
                type="text"
                placeholder="E.g: CSE"
                value={course}
                changeHandler={(e) => setCourse(e.target.value)}
              />

              <div className="lg:relative">
                <InputField
                  label="Course Code"
                  name="coursecode"
                  type="text"
                  placeholder="E.g: 101"
                  value={courseCode}
                  changeHandler={handleCourseCodeChange}
                />
                {courseCodeError && (
                  <span className="lg:flex lg:items-start lg:gap-x-0.5 lg:absolute lg:left-0 lg:top-full lg:mt-1 text-accent-lm text-sm bg-primary-lm lg:px-2 lg:py-0.5 lg:rounded lg:shadow-lg lg:z-10 lg:border border-stroke-grey">
                    <img src={warningIcon} className="lg:size-4"></img>
                    {courseCodeError}
                  </span>
                )}
              </div>
            </div>

            <InputField
              label="Resource Link"
              name="resourcelink"
              type="url"
              placeholder="https://example.com"
              value={resourceLink}
              changeHandler={(e) => setResourceLink(e.target.value)}
            />

            {/* Submit */}
            <div className="lg:flex lg:justify-end lg:mt-4">
              <button
                type="submit"
                disabled={!resourceLink || isSubmitting}
                className="lg:px-6 lg:py-2 lg:rounded-lg bg-accent-lm text-primary-lm hover:bg-hover-btn-lm lg:transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
