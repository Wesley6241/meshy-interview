import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  createTaskFromAnyContext,
  openMeshyPage,
  requestDueTaskSync,
  setFloatingExpanded,
  setTrackerMinimized,
} from "./shared/bridge";
import {
  getActiveTasks,
  getLatestActiveTask,
  getLatestTask,
  getTaskProgress,
  getTaskTimingLabel,
  type GenerationTask,
} from "./shared/tracker";
import { useTrackerState } from "./shared/useTrackerState";

function useTicker(stepMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, stepMs);

    return () => window.clearInterval(interval);
  }, [stepMs]);

  return now;
}

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const now = useTicker();
  const { state, isReady } = useTrackerState();
  const [toastVisible, setToastVisible] = useState(false);

  const tasks = state.tasks;
  const activeTasks = useMemo(() => getActiveTasks(tasks), [tasks]);
  const latestTask = getLatestTask(tasks);
  const trackerTask = getLatestActiveTask(tasks) ?? latestTask;

  const isMeshyPage = location.pathname === "/meshy";
  const shouldShowFloating = !isMeshyPage && !state.trackerMinimized && tasks.length > 0 && trackerTask;
  const shouldShowArrow = !isMeshyPage && state.trackerMinimized && tasks.length > 0;
  const generationSummary = useMemo(() => {
    if (activeTasks.length > 0) {
      return `${activeTasks.length} generating`;
    }
    if (tasks.length > 0) {
      return "All tasks completed";
    }
    return "No tasks yet";
  }, [activeTasks.length, tasks.length]);

  useEffect(() => {
    void requestDueTaskSync();
  }, []);

  useEffect(() => {
    if (isMeshyPage) {
      void setFloatingExpanded(false);
    }
  }, [isMeshyPage, location.pathname]);

  return (
    <div className="appShell">
      <TopBar
        isMeshyPage={isMeshyPage}
        activeCount={activeTasks.length}
        onGoMeshy={() => navigate("/meshy")}
        onGoExplore={() => navigate("/other")}
      />

      <Routes>
        <Route
          path="/"
          element={<Navigate to="/meshy" replace />}
        />
        <Route
          path="/meshy"
          element={
            <MeshyPage
              isReady={isReady}
              tasks={tasks}
              now={now}
              generationSummary={generationSummary}
              onGenerate={async () => {
                await createTaskFromAnyContext();
                setToastVisible(true);
                window.setTimeout(() => setToastVisible(false), 1800);
              }}
            />
          }
        />
        <Route
          path="/other"
          element={<OtherPage activeCount={activeTasks.length} latestTask={latestTask} now={now} />}
        />
      </Routes>

      {toastVisible ? <TaskCreatedToast onDismiss={() => setToastVisible(false)} /> : null}

      {shouldShowFloating ? (
        <FloatingTracker
          latestTask={trackerTask}
          activeTasks={activeTasks}
          isExpanded={state.floatingExpanded}
          now={now}
          onExpand={() => void setFloatingExpanded(true)}
          onCollapse={() => void setFloatingExpanded(false)}
          onMinimize={() => void setTrackerMinimized(true)}
          onEnterMeshy={() => void openMeshyPage()}
        />
      ) : null}

      {shouldShowArrow ? (
        <EdgeArrowTab activeCount={activeTasks.length} onRestore={() => void setTrackerMinimized(false)} />
      ) : null}
    </div>
  );
}

function TopBar({
  isMeshyPage,
  activeCount,
  onGoMeshy,
  onGoExplore,
}: {
  isMeshyPage: boolean;
  activeCount: number;
  onGoMeshy: () => void;
  onGoExplore: () => void;
}) {
  return (
    <header className="topBar">
      <div className="brandBlock">
        <div className="brandBadge">M</div>
        <div>
          <div className="brandTitle">Meshy Demo</div>
          <div className="brandSubtitle">Global Generation Task Tracker</div>
        </div>
      </div>

      <div className="topBarActions">
        <div className="statusPill">{activeCount > 0 ? `${activeCount} active tasks` : "Idle"}</div>
        <button
          type="button"
          className={`navChip ${isMeshyPage ? "isActive" : ""}`}
          onClick={onGoMeshy}
        >
          Meshy
        </button>
        <button
          type="button"
          className={`navChip ${!isMeshyPage ? "isActive" : ""}`}
          onClick={onGoExplore}
        >
          Other Page
        </button>
      </div>
    </header>
  );
}

function MeshyPage({
  isReady,
  tasks,
  now,
  generationSummary,
  onGenerate,
}: {
  isReady: boolean;
  tasks: GenerationTask[];
  now: number;
  generationSummary: string;
  onGenerate: () => void;
}) {
  return (
    <main className="pageWrap meshyPage">
      <section className="workspaceFrame">
        <div className="meshLayout">
          <aside className="leftPanel panel">
            <div className="panelSection">
              <div className="eyebrow">Generate</div>
              <div className="modePills">
                <div className="modePill isSelected">Image to 3D</div>
                <div className="modePill">Text to 3D</div>
              </div>
            </div>

            <div className="panelSection">
              <div className="fieldLabel">Model Type</div>
              <div className="fakeSelect">Standard</div>
              <div className="fieldLabel">AI Model</div>
              <div className="fakeSelect">Meshy-4 Preview</div>
            </div>

            <div className="panelSection">
              <div className="toggleRow">
                <span>Image Enhancement</span>
                <span className="fakeToggle isOn" />
              </div>
              <div className="toggleRow">
                <span>Multi-view</span>
                <span className="fakeToggle" />
              </div>
            </div>

            <div className="generateBlock">
              <div>
                <div className="fieldLabel">Estimated generation</div>
                <div className="panelValue">1.0 - 1.5 min</div>
              </div>
              <button type="button" className="generateButton" onClick={onGenerate} disabled={!isReady}>
                Generate
              </button>
            </div>
          </aside>

          <section className="viewportPanel panel">
            <div className="viewportMeta">
              <span>Topology</span>
              <span>Quad Mesh</span>
            </div>
            <div className="viewportStage">
              <div className="orbGlow orbGlowOne" />
              <div className="orbGlow orbGlowTwo" />
              <div className="emptyModel">
                <div className="emptyModelSphere" />
                <div className="emptyModelCopy">
                  <div className="emptyModelTitle">Extension Meshy Page</div>
                  <p>
                    This extension tab is the Meshy home. Click
                    <span> Generate </span>
                    here, then open any normal website to see the injected global tracker.
                  </p>
                </div>
              </div>
            </div>
            <div className="viewportFooter">
              <div className="toolChip">Texture</div>
              <div className="toolChip">Download</div>
              <div className="toolChip">Animate</div>
            </div>
          </section>

          <aside className="rightPanel panel">
            <div className="sidebarHeader">
              <div>
                <div className="eyebrow">Generation Queue</div>
                <div className="sidebarTitle">{generationSummary}</div>
              </div>
              <div className="uploadPill">Workspace</div>
            </div>

            {tasks.length === 0 ? (
              <div className="emptySidebarState">
                <div className="emptySidebarIcon" />
                <div className="emptySidebarTitle">No generations yet</div>
                <p>
                  Start with the single Generate button. Each task will appear
                  here and continue loading even if you leave this page.
                </p>
              </div>
            ) : (
              <div className="taskGrid" aria-live="polite">
                {tasks
                  .slice()
                  .reverse()
                  .map((task) => (
                    <TaskCard key={task.id} task={task} now={now} />
                  ))}
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

function TaskCard({ task, now }: { task: GenerationTask; now: number }) {
  const progress = getTaskProgress(task, now);

  return (
    <article className={`taskCard ${task.status === "done" ? "isDone" : ""}`}>
      <div className="taskPreview">
        <div className="previewGlow" />
        <div className="previewGlyph" />
        <div className="previewGrid" />
      </div>
      <div className="taskMeta">
        <div className="taskHeader">
          <div className="taskTitle">{task.title}</div>
          <div className={`taskStatus ${task.status === "done" ? "isDone" : "isGenerating"}`}>
            {task.status === "done" ? "Done" : "Generating"}
          </div>
        </div>
        <div className="progressBar">
          <span style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="taskFooter">
          <span>{getTaskTimingLabel(task, now)}</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
      </div>
    </article>
  );
}

function TaskCreatedToast({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="toastWrap" role="status" aria-live="polite">
      <div className="taskToast">
        <div className="toastBadge" />
        <div>
          <div className="toastTitle">Task created</div>
          <div className="toastText">Your 3D generation has entered the queue.</div>
        </div>
        <button type="button" className="toastClose" onClick={onDismiss} aria-label="Dismiss task created toast">
          ×
        </button>
      </div>
    </div>
  );
}

function FloatingTracker({
  latestTask,
  activeTasks,
  isExpanded,
  now,
  onExpand,
  onCollapse,
  onMinimize,
  onEnterMeshy,
}: {
  latestTask: GenerationTask;
  activeTasks: GenerationTask[];
  isExpanded: boolean;
  now: number;
  onExpand: () => void;
  onCollapse: () => void;
  onMinimize: () => void;
  onEnterMeshy: () => void;
}) {
  const latestProgress = getTaskProgress(latestTask, now);

  return (
    <div className={`floatingShell ${isExpanded ? "isExpanded" : ""}`} onClick={isExpanded ? onCollapse : undefined}>
      <button
        type="button"
        className="floatingMinimize"
        onClick={(event) => {
          event.stopPropagation();
          onMinimize();
        }}
        aria-label="Minimize tracker"
      >
        _
      </button>

      {!isExpanded ? (
        <button type="button" className="floatingCompactCard" onClick={onExpand}>
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
                  .map((task) => {
                    const progress = getTaskProgress(task, now);
                    return (
                      <div key={task.id} className="floatingListItem">
                        <div className="floatingListGlyph" />
                        <div className="floatingListMeta">
                          <div className="floatingListTitle">{task.title}</div>
                          <div className="floatingListTime">{getTaskTimingLabel(task, now)}</div>
                        </div>
                        <div className="floatingListProgress">{Math.round(progress * 100)}%</div>
                      </div>
                    );
                  })
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
                onEnterMeshy();
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

function EdgeArrowTab({ activeCount, onRestore }: { activeCount: number; onRestore: () => void }) {
  return (
    <button type="button" className="edgeArrowTab" onClick={onRestore} aria-label="Open generation tracker">
      <span className="edgeArrowGlyph">‹</span>
      {activeCount > 0 ? <span className="edgeArrowCount">{activeCount}</span> : null}
    </button>
  );
}

function OtherPage({
  activeCount,
  latestTask,
  now,
}: {
  activeCount: number;
  latestTask: GenerationTask | null;
  now: number;
}) {
  return (
    <main className="pageWrap">
      <section className="otherPage">
        <div className="otherPageHero">
          <div className="eyebrow">Outside Meshy</div>
          <h1>Open any regular website to see the real injected tracker.</h1>
          <p>
            This internal route still mirrors the concept, but the real cross-website
            version now comes from the browser extension content script, not from this page alone.
          </p>
        </div>

        <div className="otherPageGrid">
          <div className="otherCard">
            <div className="fieldLabel">Global tracker behavior</div>
            <div className="otherCardTitle">Injected on all pages</div>
            <p>
              The extension injects a compact tracker into normal websites and keeps it synchronized through session storage.
            </p>
          </div>
          <div className="otherCard">
            <div className="fieldLabel">Current queue</div>
            <div className="otherCardTitle">
              {activeCount > 0 ? `${activeCount} tasks still generating` : "No active tasks"}
            </div>
            <p>
              {latestTask
                ? `${latestTask.title} · ${getTaskTimingLabel(latestTask, now)}`
                : "Create a task in Meshy to begin the demo."}
            </p>
          </div>
          <div className="otherCard">
            <div className="fieldLabel">Why it matters</div>
            <div className="otherCardTitle">No waiting black hole</div>
            <p>
              Users can leave Meshy, browse other sites, and still keep a live sense of progress with one tap back to the Meshy tab.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  return <AppShell />;
}
