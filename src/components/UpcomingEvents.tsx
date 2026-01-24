import { Link } from "react-router-dom";
import { ButtonCTA } from "./ButtonCTA";
import { useState } from "react";

export function UpcomingEvents() {
  const [eventCount, setEventCount] = useState(1); //placeholder value

  //setEventCount will be manipulated by a handler that will fetch the current
  // interested events count (only those whose upcoming date is within 1 week of current date)
  return (
    <div className="lg:flex lg:flex-col lg:justify-between lg:w-full lg:h-fit bg-primary-lm border border-stroke-grey lg:rounded-2xl lg:overflow-hidden">
      <div className="lg:p-3 border border-t-0 border-l-0 border-r-0 border-b-stroke-grey">
        <h6 className="lg:font-[Poppins] lg:font-semibold text-text-lm">
          Upcoming Events
        </h6>
      </div>
      <div className="lg:p-4 lg:flex lg:flex-col lg:justify-start">
        {eventCount === 0 ? (
          <p className="text-text-lighter-lm text-md">No events added</p>
        ) : (
          // events will be mapped to number of events that are interested by the user ONLY WITHIN 1 week of the current date
          //will be wrapped in a <Link> where to=/(link of post)
          <div className="lg:flex lg:flex-col lg:py-2 lg:px-3 hover:bg-secondary-lm hover:w-full hover:rounded-lg">
            <p className="lg:font-medium text-md text-text-lm">
              MCSC CyberVoid'25
            </p>
            <p className="text-text-lighter-lm">Saturday, 27 Dec 2025</p>
          </div>
        )}
      </div>
      <div className="lg:flex lg:justify-end lg:p-3 lg:w-full">
        <Link to="/events">
          <ButtonCTA label={"Add More"} />
        </Link>
      </div>
    </div>
  );
}
