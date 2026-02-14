import { useEffect, useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  location: string;
  onLocationChange: (v: string) => void;
  startDate: string;
  onStartDateChange: (v: string) => void;
  endDate: string;
  onEndDateChange: (v: string) => void;
}

export default function TitleInput({
  value,
  onChange,
  description,
  onDescriptionChange,
  location,
  onLocationChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
}: Props) {
  const [sameAsStart, setSameAsStart] = useState(false);
  const [onlineEvent, setOnlineEvent] = useState(false);

  useEffect(() => {
    // keep local flags in sync when parent values change (e.g., reset)
    setOnlineEvent(location === "Online");
  }, [location]);
  useEffect(() => {
    if (sameAsStart) {
      onEndDateChange(startDate);
    }
  }, [sameAsStart, startDate, onEndDateChange]);

  function toggleSameAsStart(checked: boolean) {
    setSameAsStart(checked);
    if (checked) onEndDateChange(startDate);
  }

  function toggleOnline(checked: boolean) {
    setOnlineEvent(checked);
    if (checked) onLocationChange("Online");
    else onLocationChange("");
  }

  return (
    <div className="lg:space-y-4">
      {/* event start and end date */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <h6 className="text-text-lm font-medium">Start Date</h6>
          <input
            type="date"
            required={true}
            value={startDate}
            onChange={e => onStartDateChange(e.target.value)}
            className="bg-primary-lm lg:p-2 rounded-md border border-stroke-grey w-fit"
          />
        </div>

        <div className="flex flex-col gap-2">
          <h6 className="text-text-lm font-medium">End Date</h6>
          <label className="flex gap-2 items-center">
            <input
              type="checkbox"
              className="accent-accent-lm size-5"
              checked={sameAsStart}
              onChange={e => toggleSameAsStart(e.target.checked)}
            />
            <p className="text-text-lm">Same as Start Date</p>
          </label>
          {!sameAsStart && (
            <input
              type="date"
              required={true}
              value={endDate}
              onChange={e => onEndDateChange(e.target.value)}
              className="bg-primary-lm lg:p-2 rounded-md border border-stroke-grey w-fit"
            />
          )}
        </div>
      </div>
      {/* Title */}
      <div>
        <h6 className="lg:mb-2 lg:font-medium">Title</h6>
        <input
          className={`w-full bg-primary-lm border border-stroke-grey lg:rounded-lg lg:px-4 lg:py-2 focus:outline-none focus:border-accent-lm`}
          placeholder="Enter event title"
          value={value}
          onChange={e => onChange(e.target.value)}
          required={true}
        />
      </div>

      {/* Description */}
      <div>
        <h6 className="lg:mb-2 lg:font-medium">Description</h6>
        <textarea
          className="w-full bg-primary-lm border border-stroke-grey rounded-lg px-4 py-2 
                     focus:outline-none focus:border-accent-lm 
                     resize-none overflow-y-auto"
          placeholder="Enter event description"
          value={description}
          style={{ height: "150px" }} // fixed height
          onChange={e => onDescriptionChange(e.target.value)}
          required={true}
        />
      </div>

      {/* Location */}
      <div>
        <h6 className="lg:mb-2 text-lg lg:font-medium">Location</h6>
        <label className="flex gap-2 lg:my-2 items-center">
          <input
            type="checkbox"
            className="lg:size-5 accent-accent-lm"
            checked={onlineEvent}
            onChange={e => toggleOnline(e.target.checked)}
          />
          <p className="text-text-lm">Online Event</p>
        </label>
        {!onlineEvent && (
          <input
            className="w-full bg-primary-lm border border-stroke-grey rounded-lg px-4 py-2 focus:outline-none focus:border-accent-lm"
            placeholder="e.g: Room-302, Hall of Fame etc"
            value={location}
            onChange={e => onLocationChange(e.target.value)}
            required={true}
          />
        )}
      </div>
    </div>
  );
}
