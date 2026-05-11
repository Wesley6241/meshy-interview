import { TASK_ALARM_PREFIX, completeDueTasks, completeTask, createTask } from "../shared/tracker";
import { getTrackerState, setTrackerState } from "../shared/storage";

const MESHY_PAGE_URL = chrome.runtime.getURL("index.html#/meshy");
const MESHY_PAGE_MATCH = chrome.runtime.getURL("index.html*");

async function configureSessionAccess() {
  if (chrome.storage.session.setAccessLevel) {
    await chrome.storage.session.setAccessLevel({
      accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
    });
  }
}

async function syncDueTasks() {
  const currentState = await getTrackerState();
  const result = completeDueTasks(currentState);

  if (result.changed) {
    await setTrackerState(result.state);
  }

  return result.state;
}

async function scheduleTaskAlarm(taskId: string, targetCompleteAt: number) {
  await chrome.alarms.create(`${TASK_ALARM_PREFIX}${taskId}`, {
    when: targetCompleteAt,
  });
}

async function createBackgroundTask() {
  const currentState = await getTrackerState();
  const result = createTask(currentState);
  await setTrackerState(result.state);
  await scheduleTaskAlarm(result.task.id, result.task.targetCompleteAt);
  return result.task;
}

async function completeBackgroundTask(taskId: string) {
  const currentState = await getTrackerState();
  const nextState = completeTask(currentState, taskId);
  await setTrackerState(nextState);
}

async function openMeshyPage() {
  const tabs = await chrome.tabs.query({ url: [MESHY_PAGE_MATCH] });
  const existingTab = tabs[0];

  if (existingTab?.id !== undefined) {
    await chrome.tabs.update(existingTab.id, {
      active: true,
      url: MESHY_PAGE_URL,
    });

    if (existingTab.windowId !== undefined) {
      await chrome.windows.update(existingTab.windowId, { focused: true });
    }

    return;
  }

  await chrome.tabs.create({ url: MESHY_PAGE_URL });
}

async function initializeBackground() {
  await configureSessionAccess();
  await syncDueTasks();
}

chrome.runtime.onInstalled.addListener(() => {
  void initializeBackground();
});

chrome.runtime.onStartup.addListener(() => {
  void initializeBackground();
});

chrome.alarms.onAlarm.addListener((alarm: chrome.alarms.Alarm) => {
  if (!alarm.name.startsWith(TASK_ALARM_PREFIX)) {
    return;
  }

  const taskId = alarm.name.slice(TASK_ALARM_PREFIX.length);
  void completeBackgroundTask(taskId);
});

chrome.runtime.onMessage.addListener((
  message: { type?: string },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
) => {
  const task = async () => {
    switch (message.type) {
      case "CREATE_TASK": {
        const createdTask = await createBackgroundTask();
        sendResponse({ task: createdTask });
        return;
      }
      case "OPEN_MESHY":
        await openMeshyPage();
        sendResponse({ ok: true });
        return;
      case "SYNC_DUE_TASKS": {
        const state = await syncDueTasks();
        sendResponse({ state });
        return;
      }
      default:
        sendResponse({ ok: false });
    }
  };

  void task();
  return true;
});

void initializeBackground();
