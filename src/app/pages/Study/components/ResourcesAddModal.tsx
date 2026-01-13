import { useState } from "react";
import { InputField } from "@/components/InputField";
import { ButtonCTA } from "@/components/ButtonCTA";
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
}

export function ResourceAddModal({ onClose, onPost }: ResourceAddModalProps) {
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

    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-[#cbcbcb95] z-50" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="bg-secondary-lm border-2 border-stroke-grey rounded-xl px-10 py-8 w-130 relative animate-slide-in"
        >
          {/* Header */}
          <div className="flex justify-between items-center">
            <h4 className="font-header text-text-lm font-medium">
              Add Resource
            </h4>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer"
            >
              <img src={crossBtn} alt="Close modal" />
            </button>
          </div>

          {/* Fields */}
          <div className="mt-4 flex flex-col gap-4" onFocusCapture={() => setCourseCodeError("")}>
            <InputField
              label="Title"
              name="title"
              type="text"
              value={title}
              changeHandler={(e) => setTitle(e.target.value)}
            />

            <div className="flex justify-between">
              <InputField
                label="Course"
                name="course"
                type="text"
                placeholder="E.g: CSE"
                value={course}
                changeHandler={(e) => setCourse(e.target.value)}
              />

              <div className="relative">
                <InputField
                  label="Course Code"
                  name="coursecode"
                  type="text"
                  placeholder="E.g: 101"
                  value={courseCode}
                  changeHandler={handleCourseCodeChange}
                />
                {courseCodeError && (
                  <span className=" flex items-start gap-x-0.5 absolute left-0 top-full mt-1 text-accent-lm text-sm bg-primary-lm px-2 py-0.5 rounded shadow-lg z-10 border border-stroke-grey">
                    <img src={warningIcon} className="size-4"></img>
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
            <div className="flex justify-end mt-4">
              <ButtonCTA
                label="Post"
                type="submit"
              />
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
