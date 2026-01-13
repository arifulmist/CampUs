import { NavLink, useLocation } from "react-router";
import { SearchAnything } from "./SearchAnything";
export function BotNav() {
  return (
    <nav className="bg-primary-lm border-t-0 border-b border-stroke-grey flex items-center justify-center gap-2 h-14">
      <NavbarLinks linktxt="Home" dest="/home" />
      <NavbarLinks linktxt="CollabHub" dest="/collab" />
      <NavbarLinks linktxt="Events" dest="/events" />
      <NavbarLinks linktxt="QnA" dest="/qna" />
      <NavbarLinks linktxt="Study" dest="/study/1/1" activeMatch="/study" />
      <NavbarLinks linktxt="Lost & Found" dest="/lost-and-found" />
      <SearchAnything />
    </nav>
  );
}

function NavbarLinks({
  linktxt,
  dest,
  activeMatch,
}: {
  linktxt: string;
  dest: string;
  activeMatch?: string;
}) {
  const location = useLocation();
  const matchActive = activeMatch
    ? location.pathname.startsWith(activeMatch)
    : undefined;
  return (
    <NavLink
      to={dest}
      className={({ isActive }) =>
        [
          "relative text-accent-lm text-md font-medium h-full flex items-center justify-center px-3 hover:after:w-full hover:after:h-0.5 hover:after:bg-accent-lm hover:after:absolute hover:after:bottom-0 hover:after:animate-fade-in",
          (matchActive ?? isActive) && "bg-hover-lm",
        ].join(" ")
      }
    >
      {linktxt}
    </NavLink>
  );
}
