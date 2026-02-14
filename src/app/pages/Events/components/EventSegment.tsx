import React from "react";

type SegmentTypes = {
  segmentTitle: string;
  segmentDescription: string;
  segmentStartDate: string;
  segmentEndDate?: string;
  segmentStartTime: string;
  segmentEndTime?: string;
  segmentLocation?: string;
};

function formatDateDDMONYYYY(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatTime12hr(timeStr?: string) {
  if (!timeStr) return "";
  const m = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (m) {
    let hh = parseInt(m[1], 10);
    const mm = m[2];
    const ampm = hh >= 12 ? "pm" : "am";
    hh = hh % 12;
    if (hh === 0) hh = 12;
    return `${String(hh).padStart(2, "0")}:${mm} ${ampm}`;
  }

  const d = new Date(timeStr);
  if (!Number.isNaN(d.getTime())) {
    let hh = d.getHours();
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ampm = hh >= 12 ? "pm" : "am";
    hh = hh % 12;
    if (hh === 0) hh = 12;
    return `${String(hh).padStart(2, "0")}:${mm} ${ampm}`;
  }

  return timeStr;
}

export function EventSegment({
  segmentTitle,
  segmentDescription,
  segmentStartDate,
  segmentEndDate,
  segmentStartTime,
  segmentEndTime,
  segmentLocation,
}: SegmentTypes) {
  const sd = formatDateDDMONYYYY(segmentStartDate);
  const ed = segmentEndDate ? formatDateDDMONYYYY(segmentEndDate) : undefined;
  const st = formatTime12hr(segmentStartTime);
  const et = segmentEndTime ? formatTime12hr(segmentEndTime) : undefined;

  return (
    <div className="bg-secondary-lm lg:p-5 border border-stroke-grey rounded-lg flex flex-col lg:gap-2">
      <h5 className="text-text-lm font-semibold">{segmentTitle}</h5>
      <div>
        <p className="text-accent-lm text-sm font-medium m-0 p-0">
          {sd}{ed && ` - ${ed}`} {sd || ed ? "|" : ""} {st}{et && ` - ${et}`}
        </p>
        {segmentLocation ? <p className="m-0 p-0 text-text-lm font-medium text-sm">{segmentLocation}</p> : null}
      </div>
      <p className="m-0 p-0 text-text-lm">{segmentDescription}</p>
    </div>
  );
}