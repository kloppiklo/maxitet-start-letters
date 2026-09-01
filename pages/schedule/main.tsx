import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SchedulePage from "../../app/schedule/page";
import "../../app/globals.css";

createRoot(document.getElementById("root")!).render(<StrictMode><SchedulePage /></StrictMode>);
