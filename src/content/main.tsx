import React from "react";
import ReactDOM from "react-dom/client";
import trackerCss from "./tracker.css?inline";
import ContentTrackerApp from "./ContentTrackerApp";

const host = document.createElement("div");
host.id = "meshy-global-generation-tracker-root";

const shadowRoot = host.attachShadow({ mode: "open" });
const styleTag = document.createElement("style");
styleTag.textContent = trackerCss;
shadowRoot.appendChild(styleTag);

const appContainer = document.createElement("div");
shadowRoot.appendChild(appContainer);
document.documentElement.appendChild(host);

ReactDOM.createRoot(appContainer).render(
  <React.StrictMode>
    <ContentTrackerApp />
  </React.StrictMode>,
);
