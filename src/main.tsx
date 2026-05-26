import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { startRealtimeSyncController } from "./lib/realtimeSyncController";

startRealtimeSyncController();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
