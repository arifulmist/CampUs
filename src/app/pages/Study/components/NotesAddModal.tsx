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
      <div className="fixed inset-0 bg-[#cbcbcb95] z-50"/>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="bg-secondary-lm border-2 border-stroke-grey rounded-xl px-10 py-8 w-130 relative"
        >
          <div className="flex justify-between">
            <h4 className="font-header text-text-lm font-medium">Add File</h4>
            <button
            onClick={onClose} className="cursor-pointer"
          >
            <img src={crossBtn}></img>
          </button>
          </div>

          <div className="mt-4 flex flex-col gap-3" onFocusCapture={() => setCourseCodeError("")}>
            <InputField
              label="Title"
              name="title"
              type="text"
              value={title}
              changeHandler={(e) => setTitle(e.target.value)}
            />

            <div className="flex flex-row justify-between">
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


            {/* Upload section */}
            <div className="mt-2">
              <div className="flex items-center gap-4">
                <ButtonCTA
                  label="Upload File"
                  clickEvent={() => fileInputRef.current?.click()}
                >
                </ButtonCTA>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {file && previewUrl && (
                  <div className="relative flex items-center gap-3 bg-primary-lm w-full rounded-md px-4 py-3">
                    {/* Thumbnail */}
                    <div
                      className="w-16 h-16 border rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => setIsPreviewOpen(true)}
                    >
                      {file.type.startsWith("image") ? (
                        <img
                          src={previewUrl}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm text-text-lighter-lm">
                          PDF
                        </div>
                      )}
                    </div>

                    {/* File name */}
                    <div className="flex flex-col gap-1">
                      <p className="text-sm text-text-lighter-lm max-w-35 truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-text-lighter-lm">Click to expand preview</p>
                    </div>
                    {/* Remove */}

                    <button
                      type="button"
                      onClick={removeFile}
                      className="absolute -top-2 -right-2 bg-white rounded-full size-5 text-sm ring-1 ring-stroke-grey bg-primary-lm hover:bg-stroke-grey"
                    >
                      ✖
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end mt-4">
              <div className="relative">
                <button
                  type="submit"
                  disabled={!file && !previewUrl}
                  className="px-6 py-2 rounded-lg bg-accent-lm text-primary-lm hover:bg-hover-btn-lm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Post
                </button>
                {fileRequiredError && (
                  <span className="absolute right-0 -top-8 bg-primary-lm text-accent-lm text-sm px-2 py-1 rounded shadow z-20 border border-stroke-grey">
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
        <div className="fixed inset-0 bg-[#cbcbcb95] z-60 flex items-center justify-center">
          <button
            className="absolute top-6 right-6 text-accent-lm text-2xl"
            onClick={() => setIsPreviewOpen(false)}
          >
            ✖
          </button>

          {file?.type.startsWith("image") ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="max-w-[90%] max-h-[90%] object-contain"
            />
          ) : (
            <iframe
              src={previewUrl}
              className="w-[80%] h-[90%] bg-white"
              title="File preview"
            />
          )}
        </div>
      )}
    </>
  );
}
