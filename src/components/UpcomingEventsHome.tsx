import { Link } from "react-router-dom";
import { ButtonCTA } from "./ButtonCTA";
import { useState } from "react";

export function UpcomingEventsHome() {
  const [eventCount, setEventCount] = useState(1); // placeholder value

  // setEventCount will be manipulated by a handler that will fetch the current
  // interested events count (only those whose upcoming date is within 1 week of current date)
  return (
    <div className="flex flex-col justify-between w-[50vw] h-fit bg-primary-lm border-2 border-stroke-grey rounded-2xl">
      <div className="p-3 border border-t-0 border-l-0 border-r-0 border-b-stroke-grey">
        <h6 className="font-[Poppins] font-semibold text-text-lm">
          Upcoming Events
        </h6>
      </div>
      <div className="p-4 flex flex-col justify-start">
        {eventCount === 0 ? (
          <p className="text-text-lighter-lm text-md">No events added</p>
        ) : (
          // events will be mapped to number of events that are interested by the user ONLY WITHIN 1 week of the current date
          // will be wrapped in a <Link> where to=/(link of post)
          <div className="flex flex-col py-2 px-3 hover:bg-secondary-lm hover:w-full hover:rounded-lg">
            <p className="font-medium text-md text-text-lm">
              MCSC CyberVoid'25
            </p>
            <p className="text-text-lighter-lm">Saturday, 27 Dec 2025</p>
          </div>
        )}
      </div>
      <div className="flex justify-end p-3">
        <Link to="/events">
          <ButtonCTA label={"Add More"} />
        </Link>
      </div>
    </div>
  );
}
