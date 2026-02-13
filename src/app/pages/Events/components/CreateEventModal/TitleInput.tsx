interface Props {
  value: string;
  error: boolean;
  onChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  location: string;
  onLocationChange: (v: string) => void;
}

export default function TitleInput({
  value,
  error,
  onChange,
  description,
  onDescriptionChange,
  location,
  onLocationChange,
}: Props) {
  return (
    <div className="lg:space-y-4">
      {/* Title */}
      <div>
        <h3 className="lg:mb-2 text-lg lg:font-medium">Title</h3>
        <input
          className={`w-full border border-stroke-grey rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[#C23D00] ${
            error ? "border-red-500" : ""
          }`}
          placeholder="Enter event title"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        {error && (
          <p className="text-accent-lm lg:mt-1">
            Title field is mandatory.
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <h3 className="lg:mb-2 text-lg lg:font-medium">Description</h3>
        <textarea
          className="w-full border border-stroke-grey rounded-lg px-4 py-2 
                     focus:outline-none focus:ring-1 focus:ring-[#C23D00] 
                     resize-none overflow-y-auto"
          placeholder="Enter event description"
          value={description}
          style={{ height: "150px" }} // fixed height
          onChange={e => onDescriptionChange(e.target.value)}
        />
      </div>

      {/* Location */}
      <div>
        <h3 className="lg:mb-2 text-lg lg:font-medium">Location</h3>
        <input
          className="w-full border border-stroke-grey rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[#C23D00]"
          placeholder="Enter event location"
          value={location}
          onChange={e => onLocationChange(e.target.value)}
        />
      </div>
    </div>
  );
}
