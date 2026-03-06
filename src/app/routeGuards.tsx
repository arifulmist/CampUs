import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { supabase } from "@/supabase/supabaseClient";

const LAST_ROUTE_KEY = "campus:last_route";

function getLocalIsAuthenticated(): boolean {
  return localStorage.getItem("isAuthenticated") === "true";
}

function clearLocalAuthFlags() {
  localStorage.removeItem("user");
  localStorage.removeItem("isAuthenticated");
  localStorage.removeItem("studentId");
}

function isAllowedReturnPath(path: string | null): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false;

  // Don’t ever bounce *to* an auth route.
  if (
    path === "/signup" ||
    path === "/signup/ocr" ||
    path === "/login" ||
    path.startsWith("/login/2fa")
  ) {
    return false;
  }

  return true;
}

function useSupabaseSessionState() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setHasSession(Boolean(data.session));
      } finally {
        if (mounted) setReady(true);
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
      setReady(true);

      // If Supabase session dies, our local 2FA flag should not keep the app “logged in”.
      if (!session) {
        clearLocalAuthFlags();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { ready, hasSession };
}

export function LastRouteTracker() {
  const location = useLocation();

  useEffect(() => {
    // Track only meaningful app routes (never store auth routes).
    const path = `${location.pathname}${location.search}${location.hash}`;

    if (
      path === "/signup" ||
      path === "/signup/ocr" ||
      path === "/login" ||
      path.startsWith("/login/2fa")
    ) {
      return;
    }

    sessionStorage.setItem(LAST_ROUTE_KEY, path);
  }, [location.pathname, location.search, location.hash]);

  return null;
}

export function RootRedirect() {
  const isAuthed = getLocalIsAuthenticated();
  return <Navigate to={isAuthed ? "/home" : "/signup"} replace />;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { ready, hasSession } = useSupabaseSessionState();

  const localAuthed = getLocalIsAuthenticated();

  // If local storage claims auth but Supabase session is gone, force logout.
  useEffect(() => {
    if (!ready) return;
    if (localAuthed && !hasSession) {
      clearLocalAuthFlags();
    }
  }, [ready, localAuthed, hasSession]);

  if (!localAuthed) {
    return <Navigate to="/signup" replace state={{ from: location }} />;
  }

  if (ready && !hasSession) {
    return <Navigate to="/signup" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export function PublicOnly({ children }: { children: React.ReactNode }) {
  const isAuthed = getLocalIsAuthenticated();

  const returnTo = useMemo(() => {
    const stored = sessionStorage.getItem(LAST_ROUTE_KEY);
    if (isAllowedReturnPath(stored)) return stored;
    return "/home";
  }, []);

  if (isAuthed) {
    return <Navigate to={returnTo} replace />;
  }

  return <>{children}</>;
}
