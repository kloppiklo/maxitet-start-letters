import { TopNav } from "../components/top-nav";
import { ReportDashboard } from "./report-dashboard";

export default function ReportsPage() {
  return (
    <main>
      <TopNav active="reports" />
      <ReportDashboard />
      <footer><span>МАКСИТЕТ · ВНУТРЕННИЙ СЕРВИС</span><span>Два источника · Единый отчёт</span></footer>
    </main>
  );
}
