export type TaskStatus = "generating" | "done";

export interface GenerationTask {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: number;
  durationMs: number;
  targetCompleteAt: number;
  completedAt?: number;
}

export interface TrackerState {
  tasks: GenerationTask[];
  trackerMinimized: boolean;
  floatingExpanded: boolean;
  nextTaskNumber: number;
}

export const TRACKER_STORAGE_KEY = "globalGenerationTrackerState";
export const TASK_ALARM_PREFIX = "global-generation-task:";

const TASK_TITLES = [
  "Nebula Knight",
  "Coral Vehicle",
  "Aurora Creature",
  "Voxel Relic",
  "Studio Figure",
  "Drift Rover",
];

export const DEFAULT_TRACKER_STATE: TrackerState = {
  tasks: [],
  trackerMinimized: false,
  floatingExpanded: false,
  nextTaskNumber: 0,
};

export function getRandomDurationMs() {
  return 60000 + Math.floor(Math.random() * 30001);
}

export function createTask(state: TrackerState) {
  const taskNumber = state.nextTaskNumber + 1;
  const createdAt = Date.now();
  const durationMs = getRandomDurationMs();

  const task: GenerationTask = {
    id: `task-${createdAt}-${taskNumber}`,
    title: `${TASK_TITLES[(taskNumber - 1) % TASK_TITLES.length]} ${taskNumber}`,
    status: "generating",
    createdAt,
    durationMs,
    targetCompleteAt: createdAt + durationMs,
  };

  return {
    task,
    state: {
      ...state,
      tasks: [...state.tasks, task],
      nextTaskNumber: taskNumber,
      trackerMinimized: false,
      floatingExpanded: false,
    },
  };
}

export function completeTask(state: TrackerState, taskId: string, completedAt = Date.now()): TrackerState {
  return {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === taskId && task.status !== "done"
        ? {
            ...task,
            status: "done",
            completedAt,
          }
        : task,
    ),
  };
}

export function completeDueTasks(state: TrackerState, now = Date.now()) {
  let changed = false;
  const tasks = state.tasks.map((task) => {
    if (task.status === "generating" && task.targetCompleteAt <= now) {
      changed = true;
      return {
        ...task,
        status: "done" as const,
        completedAt: task.completedAt ?? now,
      };
    }

    return task;
  });

  return {
    changed,
    state: changed
      ? {
          ...state,
          tasks,
        }
      : state,
  };
}

export function getActiveTasks(tasks: GenerationTask[]) {
  return tasks.filter((task) => task.status === "generating");
}

export function getLatestTask(tasks: GenerationTask[]) {
  return tasks[tasks.length - 1] ?? null;
}

export function getLatestActiveTask(tasks: GenerationTask[]) {
  const activeTasks = getActiveTasks(tasks);
  return activeTasks[activeTasks.length - 1] ?? null;
}

export function getTaskProgress(task: GenerationTask, now: number) {
  if (task.status === "done") {
    return 1;
  }

  return Math.min(1, Math.max(0.04, (now - task.createdAt) / task.durationMs));
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getTaskTimingLabel(task: GenerationTask, now: number) {
  if (task.status === "done") {
    return "Ready in Meshy";
  }

  return `${formatDuration(task.targetCompleteAt - now)} remaining`;
}
