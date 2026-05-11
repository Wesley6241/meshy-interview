import { useEffect, useState } from "react";
import { DEFAULT_TRACKER_STATE, type TrackerState } from "./tracker";
import { getTrackerState, subscribeTrackerState } from "./storage";

export function useTrackerState() {
  const [state, setState] = useState<TrackerState>(DEFAULT_TRACKER_STATE);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void getTrackerState().then((nextState) => {
      if (!isMounted) {
        return;
      }

      setState(nextState);
      setIsReady(true);
    });

    const unsubscribe = subscribeTrackerState((nextState) => {
      setState(nextState);
      setIsReady(true);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return {
    isReady,
    state,
  };
}
