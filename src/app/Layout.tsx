import { Outlet, useLocation } from "react-router-dom";
import { TopNav } from "../components/TopNav";
import { BotNav } from "../components/BotNav";

export function Layout() {
  const location = useLocation();

  // adjust the list of routes where navs should be hidden
  const hideNavPaths = ["/signup", "/login"]; // hide TopNav on profile; page uses its own Navbar
  const hideNav = hideNavPaths.includes(location.pathname);

  return (
    <>
      <header className="lg:sticky lg:top-0 lg:w-full lg:z-50">
        {!hideNav && <TopNav />}
        {!hideNav && <BotNav />}
      </header>

      <main
        className={`${
          hideNav
            ? "min-h-screen h-screen flex items-center justify-center"
            : "flex items-start justify-center"
        }`} 
        data-debug-main
        style={{outline: "2px dashed rgba(220, 38, 38, 0.6)"}}
      >
        <Outlet />
      </main>
    </>
  );
}
