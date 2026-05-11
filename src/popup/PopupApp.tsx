import { useEffect, useMemo, useState } from "react";
import { createTaskFromAnyContext, openMeshyPage, requestDueTaskSync } from "../shared/bridge";
import {
  getLatestActiveTask,
  getLatestTask,
  getTaskTimingLabel,
  type GenerationTask,
} from "../shared/tracker";
import { useTrackerState } from "../shared/useTrackerState";

function PopupTaskSummary({ task, now }: { task: GenerationTask | null; now: number }) {
  if (!task) {
    return (
      <div className="popupEmpty">
        No tasks yet. Use Generate here or in the Meshy tab to start a new queue item.
      </div>
    );
  }

  return (
    <div className="popupTaskCard">
      <div className="popupTaskTitle">{task.title}</div>
      <div className="popupTaskMeta">{getTaskTimingLabel(task, now)}</div>
    </div>
  );
}

export default function PopupApp() {
  const [now, setNow] = useState(() => Date.now());
  const [toastVisible, setToastVisible] = useState(false);
  const { state } = useTrackerState();

  useEffect(() => {
    void requestDueTaskSync();

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const activeTasks = useMemo(() => state.tasks.filter((task) => task.status === "generating"), [state.tasks]);
  const latestVisibleTask = getLatestActiveTask(state.tasks) ?? getLatestTask(state.tasks);

  return (
    <div className="popupShell">
      <div className="popupEyebrow">Extension Entry</div>
      <h1 className="popupTitle">Meshy Tracker</h1>
      <p className="popupDescription">
        Create tasks here, then keep browsing. The injected tracker will follow you
        across websites.
      </p>

      <div className="popupStats">
        <div className="popupStat">
          <span className="popupStatLabel">Generating</span>
          <strong>{activeTasks.length}</strong>
        </div>
        <div className="popupStat">
          <span className="popupStatLabel">Total tasks</span>
          <strong>{state.tasks.length}</strong>
        </div>
      </div>

      <PopupTaskSummary task={latestVisibleTask} now={now} />

      <div className="popupActions">
        <button
          type="button"
          className="popupGenerateButton"
          onClick={async () => {
            await createTaskFromAnyContext();
            setToastVisible(true);
            window.setTimeout(() => setToastVisible(false), 1800);
          }}
        >
          Generate
        </button>
        <button type="button" className="popupLinkButton" onClick={() => void openMeshyPage()}>
          Enter Meshy
        </button>
      </div>

      {toastVisible ? <div className="popupToast">Task created</div> : null}
    </div>
  );
}
