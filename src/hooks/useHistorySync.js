import { useEffect, useRef } from "react";
import { pathFromState, stateFromPath, routesEqual } from "../utils/appRoutes";

/** Monotonic index for in-app hash history entries (tab session). */
let appHistoryIdx = 0;

function readStateIdx() {
  const idx = window.history.state?.appRouteIdx;
  return typeof idx === "number" ? idx : 0;
}

/**
 * Prefer browser history.back() only when the previous entry is an in-app route.
 * Otherwise run the fallback so we never exit the Azure site by accident.
 */
export function goBackOr(fallback) {
  if (typeof window === "undefined") {
    if (typeof fallback === "function") fallback();
    return;
  }
  if (readStateIdx() > 0) {
    window.history.back();
    return;
  }
  if (typeof fallback === "function") fallback();
}

/**
 * Keep workflow phase/step in sync with hash-based browser history.
 */
export default function useHistorySync({
  phase,
  currentStep,
  dispatch,
  enabled = true,
}) {
  const navigatingFromHistory = useRef(false);
  const hydrated = useRef(false);
  const lastPushedPath = useRef(null);

  useEffect(() => {
    if (!enabled || hydrated.current) return undefined;
    hydrated.current = true;

    const hash = window.location.hash;
    const hasRouteHash = Boolean(hash && hash !== "#" && hash !== "#/");

    if (hasRouteHash) {
      const next = stateFromPath(hash);
      navigatingFromHistory.current = true;
      dispatch({ type: "SET_PHASE", payload: next.phase });
      if (next.phase === "workflow") {
        dispatch({ type: "SET_STEP", payload: next.currentStep });
      }
      const path = pathFromState(next);
      appHistoryIdx = Math.max(appHistoryIdx, readStateIdx());
      window.history.replaceState({ appRoute: true, appRouteIdx: appHistoryIdx }, "", path);
      lastPushedPath.current = path;
      queueMicrotask(() => {
        navigatingFromHistory.current = false;
      });
      return undefined;
    }

    const path = pathFromState({ phase, currentStep });
    window.history.replaceState({ appRoute: true, appRouteIdx: appHistoryIdx }, "", path);
    lastPushedPath.current = path;
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, dispatch]);

  useEffect(() => {
    if (!enabled || !hydrated.current) return;
    if (navigatingFromHistory.current) return;

    const path = pathFromState({ phase, currentStep });
    if (path === lastPushedPath.current || path === window.location.hash) {
      lastPushedPath.current = path;
      return;
    }

    appHistoryIdx += 1;
    window.history.pushState({ appRoute: true, appRouteIdx: appHistoryIdx }, "", path);
    lastPushedPath.current = path;
  }, [enabled, phase, currentStep]);

  useEffect(() => {
    if (!enabled) return undefined;

    function applyHash(hash) {
      const next = stateFromPath(hash || "#/onboarding");
      const current = { phase, currentStep };
      if (routesEqual(next, current)) {
        lastPushedPath.current = pathFromState(next);
        return;
      }

      navigatingFromHistory.current = true;
      dispatch({ type: "SET_PHASE", payload: next.phase });
      if (next.phase === "workflow") {
        dispatch({ type: "SET_STEP", payload: next.currentStep });
      }
      lastPushedPath.current = pathFromState(next);
      queueMicrotask(() => {
        navigatingFromHistory.current = false;
      });
    }

    function onPopState() {
      appHistoryIdx = readStateIdx();
      applyHash(window.location.hash);
    }

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [enabled, phase, currentStep, dispatch]);
}
