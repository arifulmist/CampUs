import { useEffect, useRef, useState } from "react";
import { InputField } from "@/components/InputField";
import crossBtn from "@/assets/icons/cross_btn.svg";
import { ButtonCTA } from "@/components/ButtonCTA";
import warningIcon from "@/assets/icons/warning_icon.png";

interface NotesAddModalProps {
  onClose: () => void;
  onPost?: (data: {
    title: string;
    course: string;
    courseCode: string;
    file: File | null;
    fileLink?: string | null;
  }) => void;
}

export function NotesAddModal({ onClose, onPost }: NotesAddModalProps) {
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [courseCode, setCourseCode] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [fileRequiredError, setFileRequiredError] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  /* Cleanup object URL when modal unmounts */
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);



  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setFileRequiredError("");
  }

  function removeFile() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Require a file to be uploaded before allowing post
    if (!file && !previewUrl) {
      setFileRequiredError("Please upload a file before posting");
      return;
    }

    onPost?.({
      title,
      course,
      courseCode,
      file,
      fileLink: previewUrl ?? null,
    });

    onClose();
  }

  return (
    <>
      {/* Modal backdrop */}
      <div className="lg:fixed lg:inset-0 bg-[#cbcbcb95] lg:z-50"/>

      {/* Modal */}
      <div className="lg:fixed lg:inset-0 lg:z-50 lg:flex lg:items-center lg:justify-center">
        <form
          onSubmit={handleSubmit}
          className="bg-secondary-lm border-2 border-stroke-grey lg:rounded-xl lg:px-10 lg:py-8 lg:w-130 lg:relative"
        >
          <div className="lg:flex lg:justify-between">
            <h4 className="lg:font-header text-text-lm lg:font-medium">Add File</h4>
            <button
            onClick={onClose} className="cursor-pointer"
          >
            <img src={crossBtn}></img>
          </button>
          </div>

          <div className="lg:mt-4 lg:flex lg:flex-col lg:gap-3" onFocusCapture={() => setCourseCodeError("")}>
            <InputField
              label="Title"
              name="title"
              type="text"
              value={title}
              changeHandler={(e) => setTitle(e.target.value)}
            />

            <div className="lg:flex lg:flex-row lg:justify-between">
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


            {/* Upload section */}
            <div className="lg:mt-2">
              <div className="lg:flex lg:items-center lg:gap-4">
                <ButtonCTA
                  label="Upload File"
                  clickEvent={() => fileInputRef.current?.click()}
                >
                </ButtonCTA>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="lg:hidden"
                  onChange={handleFileChange}
                />

                {file && previewUrl && (
                  <div className="lg:relative lg:flex lg:items-center lg:gap-3 bg-primary-lm lg:w-full lg:rounded-md lg:px-4 lg:py-3">
                    {/* Thumbnail */}
                    <div
                      className="lg:w-16 lg:h-16 lg:border lg:rounded-lg lg:overflow-hidden cursor-pointer"
                      onClick={() => setIsPreviewOpen(true)}
                    >
                      {file.type.startsWith("image") ? (
                        <img
                          src={previewUrl}
                          alt={file.name}
                          className="lg:w-full lg:h-full lg:object-cover"
                        />
                      ) : (
                        <div className="lg:w-full lg:h-full lg:flex lg:items-center lg:justify-center text-sm text-text-lighter-lm">
                          PDF
                        </div>
                      )}
                    </div>

                    {/* File name */}
                    <div className="lg:flex lg:flex-col lg:gap-1">
                      <p className="text-sm text-text-lighter-lm lg:max-w-35 lg:truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-text-lighter-lm">Click to expand preview</p>
                    </div>
                    {/* Remove */}

                    <button
                      type="button"
                      onClick={removeFile}
                      className="lg:absolute lg:-top-2 lg:-right-2 bg-white lg:rounded-full lg:size-5 text-sm ring-1 ring-stroke-grey bg-primary-lm hover:bg-stroke-grey"
                    >
                      ✖
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="lg:flex lg:justify-end lg:mt-4">
              <div className="lg:relative">
                <button
                  type="submit"
                  disabled={!file && !previewUrl}
                  className="lg:px-6 lg:py-2 lg:rounded-lg bg-accent-lm text-primary-lm hover:bg-hover-btn-lm lg:transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Post
                </button>
                {fileRequiredError && (
                  <span className="lg:absolute lg:right-0 lg:-top-8 bg-primary-lm text-accent-lm text-sm lg:px-2 lg:py-1 lg:rounded lg:shadow lg:z-20 lg:border border-stroke-grey">
                    {fileRequiredError}
                  </span>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Full preview overlay */}
      {isPreviewOpen && previewUrl && (
        <div className="lg:fixed lg:inset-0 bg-[#cbcbcb95] lg:z-60 lg:flex lg:items-center lg:justify-center">
          <button
            className="lg:absolute lg:top-6 lg:right-6 text-accent-lm text-2xl"
            onClick={() => setIsPreviewOpen(false)}
          >
            ✖
          </button>

          {file?.type.startsWith("image") ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="lg:max-w-[90%] lg:max-h-[90%] lg:object-contain"
            />
          ) : (
            <iframe
              src={previewUrl}
              className="lg:w-[80%] lg:h-[90%] bg-white"
              title="File preview"
            />
          )}
        </div>
      )}
    </>
  );
}
