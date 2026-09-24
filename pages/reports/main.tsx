import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ReportsPage from "../../app/reports/page";
import "../../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ReportsPage />
  </StrictMode>,
);
