import { useEffect, useState } from "react";
import { fetchTrackerState } from "./bridge";
import { DEFAULT_TRACKER_STATE, type TrackerState } from "./tracker";
import { getTrackerState, subscribeTrackerState } from "./storage";

export function useTrackerState() {
  const [state, setState] = useState<TrackerState>(DEFAULT_TRACKER_STATE);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void fetchTrackerState().then((nextState) => {
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

    const handleRuntimeMessage = (message: { type?: string; state?: TrackerState }) => {
      if (!isMounted || message.type !== "TRACKER_STATE_UPDATED" || !message.state) {
        return;
      }

      setState(message.state);
      setIsReady(true);
    };

    if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    }

    return () => {
      isMounted = false;
      unsubscribe();
      if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
      }
    };
  }, []);

  return {
    isReady,
    state,
  };
}
