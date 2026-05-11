import { useEffect, useMemo, useState } from "react";
import {
  openMeshyPage,
  requestDueTaskSync,
  setFloatingExpanded,
  setTrackerMinimized,
} from "../shared/bridge";
import {
  getActiveTasks,
  getLatestActiveTask,
  getLatestTask,
  getTaskProgress,
  getTaskTimingLabel,
  type GenerationTask,
} from "../shared/tracker";
import { useTrackerState } from "../shared/useTrackerState";

function FloatingTracker({
  latestTask,
  activeTasks,
  isExpanded,
  now,
}: {
  latestTask: GenerationTask;
  activeTasks: GenerationTask[];
  isExpanded: boolean;
  now: number;
}) {
  const latestProgress = getTaskProgress(latestTask, now);

  return (
    <div className={`floatingShell ${isExpanded ? "isExpanded" : ""}`} onClick={isExpanded ? () => void setFloatingExpanded(false) : undefined}>
      <button
        type="button"
        className="floatingMinimize"
        onClick={(event) => {
          event.stopPropagation();
          void setTrackerMinimized(true);
        }}
        aria-label="Minimize tracker"
      >
        _
      </button>

      {!isExpanded ? (
        <button type="button" className="floatingCompactCard" onClick={() => void setFloatingExpanded(true)}>
          {activeTasks.length > 1 ? <div className="floatingCounter">+{activeTasks.length - 1}</div> : null}
          <div className="floatingStatusStack">
            <div className="floatingStatusRingWrap">
              <div
                className="floatingStatusRing"
                style={{ ["--progress" as string]: `${latestProgress}` }}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(latestProgress * 100)}
              />
            </div>
            <div className="floatingStatusPercent">
              {latestTask.status === "done" ? "100%" : `${Math.round(latestProgress * 100)}%`}
            </div>
            <div className="floatingCompactTitle">{latestTask.title}</div>
          </div>
        </button>
      ) : (
        <div className="floatingExpandedFrame">
          <div className="floatingExpandedPanel" onClick={(event) => event.stopPropagation()}>
            <div className="floatingExpandedHeader">
              <div>
                <div className="eyebrow">In progress</div>
                <div className="floatingExpandedTitle">
                  {activeTasks.length > 0 ? `${activeTasks.length} active tasks` : "Latest result ready"}
                </div>
              </div>
              <div className="compactHint">Click outside this panel to collapse</div>
            </div>

            <div className="floatingList">
              {activeTasks.length > 0 ? (
                activeTasks
                  .slice()
                  .reverse()
                  .map((task) => (
                    <div key={task.id} className="floatingListItem">
                      <div className="floatingListGlyph" />
                      <div className="floatingListMeta">
                        <div className="floatingListTitle">{task.title}</div>
                        <div className="floatingListTime">{getTaskTimingLabel(task, now)}</div>
                      </div>
                      <div className="floatingListProgress">{Math.round(getTaskProgress(task, now) * 100)}%</div>
                    </div>
                  ))
              ) : (
                <div className="floatingEmptyState">
                  All current tasks are ready. Enter Meshy to inspect, refine, or download the results.
                </div>
              )}
            </div>

            <button
              type="button"
              className="enterMeshyButton"
              onClick={(event) => {
                event.stopPropagation();
                void openMeshyPage();
              }}
            >
              Enter Meshy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EdgeArrowTab({ activeCount }: { activeCount: number }) {
  return (
    <button type="button" className="edgeArrowTab" onClick={() => void setTrackerMinimized(false)} aria-label="Open generation tracker">
      <span className="edgeArrowGlyph">‹</span>
      {activeCount > 0 ? <span className="edgeArrowCount">{activeCount}</span> : null}
    </button>
  );
}

export default function ContentTrackerApp() {
  const [now, setNow] = useState(() => Date.now());
  const { isReady, state } = useTrackerState();

  useEffect(() => {
    void requestDueTaskSync();

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const activeTasks = useMemo(() => getActiveTasks(state.tasks), [state.tasks]);
  const latestTask = getLatestActiveTask(state.tasks) ?? getLatestTask(state.tasks);

  if (!isReady || state.tasks.length === 0) {
    return null;
  }

  return (
    <div className="contentTrackerRoot">
      {!state.trackerMinimized && latestTask ? (
        <FloatingTracker
          latestTask={latestTask}
          activeTasks={activeTasks}
          isExpanded={state.floatingExpanded}
          now={now}
        />
      ) : null}

      {state.trackerMinimized ? <EdgeArrowTab activeCount={activeTasks.length} /> : null}
    </div>
  );
}
