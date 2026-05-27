import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { startRealtimeSyncController } from "./lib/realtimeSyncController";

const REALTIME_UPDATED_EVENT = "filmwave:realtime-projects-updated";

startRealtimeSyncController();

function Root() {
  const [appKey, setAppKey] = useState(0);

  useEffect(() => {
    function handleRealtimeProjectsUpdated() {
      setAppKey((current) => current + 1);
    }

    window.addEventListener(REALTIME_UPDATED_EVENT, handleRealtimeProjectsUpdated);

    return () => {
      window.removeEventListener(REALTIME_UPDATED_EVENT, handleRealtimeProjectsUpdated);
    };
  }, []);

  return <App key={appKey} />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
