import {
  completeDueTasks,
  DEFAULT_TRACKER_STATE,
  TRACKER_STORAGE_KEY,
  type TrackerState,
} from "./tracker";

type StateListener = (state: TrackerState) => void;

const memoryListeners = new Set<StateListener>();
let memoryState = DEFAULT_TRACKER_STATE;

function cloneState(state: TrackerState): TrackerState {
  return {
    ...state,
    tasks: state.tasks.map((task) => ({ ...task })),
    floatingPosition: state.floatingPosition ? { ...state.floatingPosition } : null,
  };
}

function hasSessionStorage() {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.session);
}

async function getSessionState() {
  const result = await chrome.storage.session.get(TRACKER_STORAGE_KEY);
  const stored = result[TRACKER_STORAGE_KEY] as TrackerState | undefined;

  if (stored) {
    return cloneState({
      ...DEFAULT_TRACKER_STATE,
      ...stored,
      tasks: stored.tasks ?? [],
      floatingPosition: stored.floatingPosition ?? null,
    });
  }

  await chrome.storage.session.set({
    [TRACKER_STORAGE_KEY]: DEFAULT_TRACKER_STATE,
  });

  return cloneState(DEFAULT_TRACKER_STATE);
}

export async function getTrackerState() {
  if (!hasSessionStorage()) {
    return cloneState(memoryState);
  }

  return getSessionState();
}

export async function setTrackerState(state: TrackerState) {
  const nextState = cloneState(state);

  if (!hasSessionStorage()) {
    memoryState = nextState;
    memoryListeners.forEach((listener) => listener(cloneState(nextState)));
    return nextState;
  }

  await chrome.storage.session.set({
    [TRACKER_STORAGE_KEY]: nextState,
  });

  return nextState;
}

export async function updateTrackerState(updater: (state: TrackerState) => TrackerState) {
  const currentState = await getTrackerState();
  return setTrackerState(updater(currentState));
}

export async function syncDueTasks() {
  const currentState = await getTrackerState();
  const result = completeDueTasks(currentState);

  if (result.changed) {
    await setTrackerState(result.state);
    return result.state;
  }

  return currentState;
}

export function subscribeTrackerState(listener: StateListener) {
  if (!hasSessionStorage()) {
    memoryListeners.add(listener);
    return () => {
      memoryListeners.delete(listener);
    };
  }

  const handleChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== "session" || !changes[TRACKER_STORAGE_KEY]?.newValue) {
      return;
    }

    listener(cloneState(changes[TRACKER_STORAGE_KEY].newValue as TrackerState));
  };

  chrome.storage.onChanged.addListener(handleChange);

  return () => {
    chrome.storage.onChanged.removeListener(handleChange);
  };
}
