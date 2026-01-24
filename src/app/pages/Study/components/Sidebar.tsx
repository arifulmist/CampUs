import { NavLink, useLocation } from "react-router";

export function Sidebar({batch}:{batch:string})
{
  return(
    <aside className="lg:flex lg:flex-col lg:fixed bg-primary-lm lg:w-[20vw] lg:h-full lg:px-4 lg:py-3">
      <h4 className="text-text-lm lg:font-semibold lg:mb-2">{batch}</h4>
      <hr className="border-stroke-grey"></hr>
      <div className="lg:flex lg:flex-col lg:gap-2 lg:mt-4">
        <LevelButton level={1} term={1}></LevelButton>
        <LevelButton level={1} term={2}></LevelButton>
        <LevelButton level={2} term={1}></LevelButton>
        <LevelButton level={2} term={2}></LevelButton>
        <LevelButton level={3} term={1}></LevelButton>
        <LevelButton level={3} term={2}></LevelButton>
        <LevelButton level={4} term={1}></LevelButton>
        <LevelButton level={4} term={2}></LevelButton>
      </div>
    </aside>
  );
}

function LevelButton({level, term}:{level:number, term: number})
{
  const location = useLocation();
  const suffix = location.pathname.includes("/resources") ? "/resources" : "/notes";
  return (
    <NavLink
      to={`/study/${level}/${term}${suffix}`}
      className={({ isActive }) => [
        "px-3 py-3 w-full rounded-lg text-md font-medium",
        isActive ? "bg-accent-lm text-primary-lm hover:bg-hover-btn-lm transition" : "bg-secondary-lm text-text-lighter-lm hover:bg-stroke-grey transition",
      ].join(" ")}>
      Level-<strong>{level}</strong> : Term-<strong>{term}</strong>
    </NavLink>
  );
}