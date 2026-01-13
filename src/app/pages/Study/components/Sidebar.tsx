import { NavLink, useLocation } from "react-router";

export function Sidebar({batch}:{batch:string})
{
  return(
    <aside className="flex flex-col fixed bg-primary-lm w-[20vw] h-full px-4 py-3">
      <h4 className="text-text-lm font-semibold mb-2">{batch}</h4>
      <hr className="border-stroke-grey"></hr>
      <div className="flex flex-col gap-2 mt-4">
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