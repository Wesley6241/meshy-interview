import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  openMeshyPage,
  requestDueTaskSync,
  setFloatingExpanded,
  setFloatingPosition,
  setTrackerMinimized,
} from "../shared/bridge";
import {
  getActiveTasks,
  getLatestActiveTask,
  getLatestTask,
  getTaskProgress,
  getTaskTimingLabel,
  type FloatingPosition,
  type GenerationTask,
} from "../shared/tracker";
import { useDraggableFloatingPanel } from "../shared/useDraggableFloatingPanel";
import { useTrackerState } from "../shared/useTrackerState";
import { TaskProgressRing } from "../TaskProgressRing";

function FloatingTracker({
  latestTask,
  activeTasks,
  isExpanded,
  now,
  floatingPosition,
  onFloatingPositionCommit,
}: {
  latestTask: GenerationTask;
  activeTasks: GenerationTask[];
  isExpanded: boolean;
  now: number;
  floatingPosition: FloatingPosition | null;
  onFloatingPositionCommit: (position: FloatingPosition) => void;
}) {
  const latestProgress = getTaskProgress(latestTask, now);
  const shellRef = useRef<HTMLDivElement>(null);
  const drag = useDraggableFloatingPanel({
    position: floatingPosition,
    onCommit: onFloatingPositionCommit,
    elementRef: shellRef,
    enabled: true,
  });

  return (
    <div
      ref={shellRef}
      className={`floatingShell ${isExpanded ? "isExpanded" : ""}${drag.isDragging ? " isDragging" : ""}`}
      style={drag.positionStyle}
      onClick={() => {
        if (drag.suppressClickRef.current) {
          drag.suppressClickRef.current = false;
          return;
        }
        void setFloatingExpanded(isExpanded ? false : true);
      }}
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerCancel}
    >
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
        <div
          role="button"
          tabIndex={0}
          className="floatingCompactCard"
          onClick={(event) => {
            event.stopPropagation();
            if (drag.suppressClickRef.current) {
              drag.suppressClickRef.current = false;
              return;
            }
            void setFloatingExpanded(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              void setFloatingExpanded(true);
            }
          }}
        >
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
            <div className="floatingStatusPercent">{getTaskTimingLabel(latestTask, now)}</div>
            <div className="floatingCompactTitle">{latestTask.title}</div>
          </div>
        </div>
      ) : (
        <div className="floatingExpandedFrame">
          <div className="floatingExpandedPanel">
            <div className="floatingExpandedHeader">
              <div>
                <div className="eyebrow">In progress</div>
                <div className="floatingExpandedTitle">
                  {activeTasks.length > 0 ? `${activeTasks.length} active tasks` : "Latest result ready"}
                </div>
              </div>
            </div>

            <div className="floatingList">
              {activeTasks.length > 0 ? (
                activeTasks
                  .slice()
                  .reverse()
                  .map((task) => (
                    <div
                      key={task.id}
                      className="floatingListItem"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="floatingListTitle">{task.title}</div>
                      <div className="floatingListProgressRow">
                        <TaskProgressRing progress={getTaskProgress(task, now)} size="sm" />
                        <span className="floatingListCompleteLabel">{getTaskTimingLabel(task, now)}</span>
                      </div>
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

function EdgeArrowTab({
  activeCount,
  floatingPosition,
  onFloatingPositionCommit,
}: {
  activeCount: number;
  floatingPosition: FloatingPosition | null;
  onFloatingPositionCommit: (position: FloatingPosition) => void;
}) {
  const tabRef = useRef<HTMLButtonElement>(null);
  const drag = useDraggableFloatingPanel({
    position: floatingPosition,
    onCommit: onFloatingPositionCommit,
    elementRef: tabRef,
    enabled: true,
  });

  const tabStyle =
    drag.positionStyle != null ? ({ ...drag.positionStyle, transform: "none" } as const) : undefined;

  return (
    <button
      ref={tabRef}
      type="button"
      className={`edgeArrowTab${drag.isDragging ? " isDragging" : ""}`}
      style={tabStyle}
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerCancel}
      onClick={() => {
        if (drag.suppressClickRef.current) {
          drag.suppressClickRef.current = false;
          return;
        }
        void setTrackerMinimized(false);
      }}
      aria-label="Open generation tracker"
    >
      <span className="edgeArrowGlyph">‹</span>
      {activeCount > 0 ? <span className="edgeArrowCount">{activeCount}</span> : null}
    </button>
  );
}

export default function ContentTrackerApp() {
  const [now, setNow] = useState(() => Date.now());
  const { isReady, state } = useTrackerState();

  const commitFloatingPosition = useCallback((position: FloatingPosition) => {
    void setFloatingPosition(position);
  }, []);

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
          floatingPosition={state.floatingPosition}
          onFloatingPositionCommit={commitFloatingPosition}
        />
      ) : null}

      {state.trackerMinimized ? (
        <EdgeArrowTab
          activeCount={activeTasks.length}
          floatingPosition={state.floatingPosition}
          onFloatingPositionCommit={commitFloatingPosition}
        />
      ) : null}
    </div>
  );
}
