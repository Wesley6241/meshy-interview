import { createTask, type GenerationTask } from "./tracker";
import { setTrackerState, updateTrackerState } from "./storage";
import type { TrackerState } from "./tracker";

type ExtensionMessage =
  | { type: "CREATE_TASK" }
  | { type: "OPEN_MESHY" }
  | { type: "SYNC_DUE_TASKS" }
  | { type: "GET_TRACKER_STATE" }
  | { type: "SET_TRACKER_MINIMIZED"; minimized: boolean }
  | { type: "SET_FLOATING_EXPANDED"; expanded: boolean };

const localTimeoutMap = new Map<string, number>();

function hasRuntime() {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime?.sendMessage);
}

function sendMessage<T>(message: ExtensionMessage) {
  return new Promise<T>((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T) => {
      const runtimeError = chrome.runtime.lastError;

      if (runtimeError) {
        reject(runtimeError);
        return;
      }

      resolve(response);
    });
  });
}

export async function createTaskFromAnyContext() {
  if (hasRuntime()) {
    const response = await sendMessage<{ task: GenerationTask }>({ type: "CREATE_TASK" });
    return response.task;
  }

  const result = await updateTrackerState((state) => createTask(state).state);
  const task = result.tasks[result.tasks.length - 1];

  if (task) {
    const timeoutId = window.setTimeout(async () => {
      await updateTrackerState((state) => ({
        ...state,
        tasks: state.tasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: "done",
                completedAt: Date.now(),
              }
            : item,
        ),
      }));
      localTimeoutMap.delete(task.id);
    }, task.durationMs);

    localTimeoutMap.set(task.id, timeoutId);
  }

  return task ?? null;
}

export async function openMeshyPage() {
  if (hasRuntime()) {
    await sendMessage({ type: "OPEN_MESHY" });
    return;
  }

  window.location.hash = "#/meshy";
}

export async function requestDueTaskSync() {
  if (hasRuntime()) {
    await sendMessage({ type: "SYNC_DUE_TASKS" });
  }
}

export async function fetchTrackerState() {
  if (hasRuntime()) {
    const response = await sendMessage<{ state: TrackerState }>({ type: "GET_TRACKER_STATE" });
    return response.state;
  }

  return updateTrackerState((state) => state);
}

export async function setTrackerMinimized(minimized: boolean) {
  if (hasRuntime()) {
    await sendMessage({ type: "SET_TRACKER_MINIMIZED", minimized });
    return;
  }

  await updateTrackerState((state) => ({
    ...state,
    trackerMinimized: minimized,
    floatingExpanded: minimized ? false : state.floatingExpanded,
  }));
}

export async function setFloatingExpanded(expanded: boolean) {
  if (hasRuntime()) {
    await sendMessage({ type: "SET_FLOATING_EXPANDED", expanded });
    return;
  }

  await updateTrackerState((state) => ({
    ...state,
    floatingExpanded: expanded,
  }));
}

export async function resetTrackerUiState() {
  await setTrackerState({
    tasks: [],
    trackerMinimized: false,
    floatingExpanded: false,
    nextTaskNumber: 0,
  });
}
