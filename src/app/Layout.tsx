import { Outlet, useLocation } from "react-router-dom";
import { TopNav } from "../components/TopNav";
import { BotNav } from "../components/BotNav";
import { OnlineUsersProvider } from "./OnlineUsersProvider";
import { LastRouteTracker } from "./routeGuards";

export function Layout() {
  const location = useLocation();

  const hideNavPaths = ["/signup", "/login"];
  const hideNav = hideNavPaths.includes(location.pathname);

  return (
    <OnlineUsersProvider>
      <>
        <LastRouteTracker />
        <header className="lg:sticky lg:top-0 lg:w-full lg:z-50">
          {!hideNav && <TopNav />}
          {!hideNav && <BotNav />}
        </header>

        <main
          className={`${
            hideNav
              ? "min-h-screen h-screen flex items-center justify-center"
              : "flex items-center justify-center"
          }`}
        >
          <Outlet />
        </main>
      </>
    </OnlineUsersProvider>
  );
}
