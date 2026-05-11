import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type TaskStatus = "generating" | "done";

export interface GenerationTask {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: number;
  durationMs: number;
  completedAt?: number;
}

interface TrackerContextValue {
  tasks: GenerationTask[];
  latestTask: GenerationTask | null;
  activeTasks: GenerationTask[];
  trackerMinimized: boolean;
  floatingExpanded: boolean;
  toastVisible: boolean;
  createTask: () => void;
  openFloatingList: () => void;
  closeFloatingList: () => void;
  minimizeTracker: () => void;
  restoreTracker: () => void;
  hideToast: () => void;
}

const GenerationTrackerContext = createContext<TrackerContextValue | null>(null);

const TASK_TITLES = [
  "Nebula Knight",
  "Coral Vehicle",
  "Aurora Creature",
  "Voxel Relic",
  "Studio Figure",
  "Drift Rover",
];

function getRandomDurationMs() {
  return 60000 + Math.floor(Math.random() * 30001);
}

export function GenerationTrackerProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [trackerMinimized, setTrackerMinimized] = useState(false);
  const [floatingExpanded, setFloatingExpanded] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const taskCounterRef = useRef(0);
  const timeoutMapRef = useRef<Map<string, number>>(new Map());
  const toastTimeoutRef = useRef<number | null>(null);

  const hideToast = useCallback(() => {
    setToastVisible(false);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
  }, []);

  const createTask = useCallback(() => {
    const nextIndex = taskCounterRef.current;
    taskCounterRef.current += 1;

    const task: GenerationTask = {
      id: `task-${Date.now()}-${nextIndex}`,
      title: `${TASK_TITLES[nextIndex % TASK_TITLES.length]} ${nextIndex + 1}`,
      status: "generating",
      createdAt: Date.now(),
      durationMs: getRandomDurationMs(),
    };

    setTasks((current) => [...current, task]);
    setTrackerMinimized(false);
    setFloatingExpanded(false);
    setToastVisible(true);

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = window.setTimeout(() => {
      setToastVisible(false);
      toastTimeoutRef.current = null;
    }, 1800);

    const completeTimeout = window.setTimeout(() => {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: "done",
                completedAt: Date.now(),
              }
            : item,
        ),
      );
      timeoutMapRef.current.delete(task.id);
    }, task.durationMs);

    timeoutMapRef.current.set(task.id, completeTimeout);
  }, []);

  const openFloatingList = useCallback(() => {
    setFloatingExpanded(true);
  }, []);

  const closeFloatingList = useCallback(() => {
    setFloatingExpanded(false);
  }, []);

  const minimizeTracker = useCallback(() => {
    setTrackerMinimized(true);
    setFloatingExpanded(false);
  }, []);

  const restoreTracker = useCallback(() => {
    setTrackerMinimized(false);
    setFloatingExpanded(false);
  }, []);

  useEffect(() => {
    return () => {
      timeoutMapRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutMapRef.current.clear();
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const value = useMemo<TrackerContextValue>(() => {
    const activeTasks = tasks.filter((task) => task.status === "generating");
    const latestTask = tasks[tasks.length - 1] ?? null;

    return {
      tasks,
      latestTask,
      activeTasks,
      trackerMinimized,
      floatingExpanded,
      toastVisible,
      createTask,
      openFloatingList,
      closeFloatingList,
      minimizeTracker,
      restoreTracker,
      hideToast,
    };
  }, [
    closeFloatingList,
    createTask,
    floatingExpanded,
    hideToast,
    minimizeTracker,
    restoreTracker,
    tasks,
    toastVisible,
    trackerMinimized,
  ]);

  return <GenerationTrackerContext.Provider value={value}>{children}</GenerationTrackerContext.Provider>;
}

export function useGenerationTracker() {
  const context = useContext(GenerationTrackerContext);

  if (!context) {
    throw new Error("useGenerationTracker must be used within GenerationTrackerProvider");
  }

  return context;
}
