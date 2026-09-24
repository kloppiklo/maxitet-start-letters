"use client";

import { useEffect, useMemo, useState } from "react";
import { buildTeacherReport, parseCsv } from "./report-data";
import type { ReportMetric, SignalStatus, TeacherReport, TeacherReportPayload } from "./report-data";

const PUBLIC_SHEETS = [
  "https://docs.google.com/spreadsheets/d/1kxNYk29BoPG_4GXHYE0qIMiIO6UAlS45NQt-4N5i0YA/export?format=csv&gid=0",
  "https://docs.google.com/spreadsheets/d/1jH55sr0RFtJnxUCZ4KswKVpSCtTU-n6ES7UUClNh078/export?format=csv&gid=0",
] as const;

const STATUS_LABEL: Record<SignalStatus, string> = {
  red: "Требует внимания",
  yellow: "Нужно наблюдать",
  green: "В норме",
  neutral: "Без порога",
};

const METRIC_LABELS: Record<string, string> = {
  attendance: "посещаемость",
  homework: "выполнение ДЗ",
  rejected: "непринятые ДЗ",
};

function format(value: number | null, unit = "") {
  if (value == null) return "—";
  const formatted = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
  return `${formatted}${unit ? ` ${unit}` : ""}`;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toLocaleUpperCase("ru-RU");
}

function MetricCard({ item }: { item: ReportMetric }) {
  return (
    <article className={`report-metric report-metric-${item.status}`}>
      <span>{item.label}</span>
      <strong>{format(item.value, item.unit)}</strong>
      <small>{item.hint || STATUS_LABEL[item.status]}</small>
    </article>
  );
}

function TeacherDetails({ teacher, methodology }: { teacher: TeacherReport; methodology: string }) {
  return (
    <div className="teacher-detail">
      <div className="teacher-detail-head">
        <div className="teacher-avatar teacher-avatar-large">{initials(teacher.name)}</div>
        <div>
          <span className="report-kicker">ПЕРСОНАЛЬНЫЙ ОТЧЁТ</span>
          <h2>{teacher.name}</h2>
          <p>Тимлид: {teacher.teamLead} · {teacher.groupsCount} групп · {teacher.lessonsCount} занятий М.Класс</p>
        </div>
        <span className={`report-status report-status-${teacher.overall}`}>{STATUS_LABEL[teacher.overall]}</span>
      </div>

      <div className="teacher-detail-layout">
        <div className="teacher-metrics-stack">
          <section className="report-panel">
            <div className="report-panel-title"><h3>Учёба и проверка</h3><span>7 показателей</span></div>
            <div className="report-metric-grid">{teacher.metrics.map((item) => <MetricCard item={item} key={item.id} />)}</div>
          </section>
          <section className="report-panel">
            <div className="report-panel-title"><h3>М.Класс</h3><span>{teacher.lessonsCount} занятий</span></div>
            <div className="report-metric-grid">{teacher.mclassMetrics.map((item) => <MetricCard item={item} key={item.id} />)}</div>
            <p className="report-method">{methodology}. Порог пока зафиксирован только для присутствия; остальные метрики информационные.</p>
          </section>
        </div>

        <aside className="teacher-side-stack">
          <section className="report-panel">
            <div className="report-panel-title"><h3>Требует внимания</h3><span>{teacher.attention.length}</span></div>
            {teacher.attention.length ? <ul className="attention-list">{teacher.attention.map((item) => (
              <li key={item.id}><span><i className={`signal-dot signal-dot-${item.status}`} />{item.label}</span><b>{format(item.value, item.unit)}</b></li>
            ))}</ul> : <p className="report-empty-small">Пороговые показатели в норме.</p>}
          </section>
          <section className="report-panel">
            <div className="report-panel-title"><h3>Группы риска</h3><span>{teacher.riskGroups.length}</span></div>
            {teacher.riskGroups.length ? <div className="risk-groups">{teacher.riskGroups.slice(0, 8).map((group) => (
              <div key={group.name}><b>{group.name}</b><span>{group.risks.map((risk) => METRIC_LABELS[risk]).join(" · ")}</span></div>
            ))}</div> : <p className="report-empty-small">Красных показателей по группам нет.</p>}
          </section>
          <section className="report-panel report-next-panel">
            <span className="report-kicker">СЛЕДУЮЩИЙ ЭТАП</span>
            <h3>Динамика по неделям</h3>
            <p>После сохранения первого недельного снимка здесь появится сравнение с прошлой неделей.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function ReportDashboard() {
  const [data, setData] = useState<TeacherReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"team" | "teacher">("team");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "red" | "yellow" | "green">("all");
  const [teamLead, setTeamLead] = useState("all");
  const [selectedId, setSelectedId] = useState("");

  const load = async (force = false) => {
    setLoading(true);
    setError("");
    try {
      let payload: TeacherReportPayload;
      const response = await fetch(`/api/teacher-report${force ? "?refresh=1" : ""}`);
      if (response.ok) {
        payload = await response.json();
      } else {
        const sheets = await Promise.all(PUBLIC_SHEETS.map(async (url) => {
          const sheetResponse = await fetch(url);
          if (!sheetResponse.ok) throw new Error(`Источник данных ответил ${sheetResponse.status}`);
          return parseCsv(await sheetResponse.text());
        }));
        payload = buildTeacherReport(sheets[0], sheets[1]);
      }
      setData(payload);
      setSelectedId((current) => current || payload.teachers[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const normalized = query.trim().toLocaleLowerCase("ru-RU");
    return data.teachers.filter((teacher) =>
      (status === "all" || teacher.overall === status) &&
      (teamLead === "all" || teacher.teamLead === teamLead) &&
      (!normalized || `${teacher.name} ${teacher.teamLead}`.toLocaleLowerCase("ru-RU").includes(normalized)),
    );
  }, [data, query, status, teamLead]);

  const selected = data?.teachers.find((teacher) => teacher.id === selectedId) ?? data?.teachers[0];
  const updatedAt = data ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(data.generatedAt)) : "";

  const openTeacher = (teacher: TeacherReport) => {
    setSelectedId(teacher.id);
    setView("teacher");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading && !data) return <div className="report-loading" role="status"><span /><span /><span /><p>Собираем данные из двух таблиц…</p></div>;
  if (error && !data) return <div className="report-error"><b>Не удалось обновить отчёт</b><p>{error}</p><button onClick={() => void load(true)}>Попробовать ещё раз</button></div>;
  if (!data) return null;

  return (
    <>
      <section className="reports-heading">
        <div>
          <div className="eyebrow">ЕЖЕНЕДЕЛЬНЫЙ ПУЛЬС КОМАНДЫ</div>
          <h1>Отчёты по<br /><em>преподавателям</em></h1>
          <p>Учебные показатели, проверка работ и активность в М.Класс — в одном месте.</p>
        </div>
        <div className="report-sync-card">
          <span><i className="status-dot" /> ДАННЫЕ АКТУАЛЬНЫ</span>
          <strong>{updatedAt}</strong>
          <button onClick={() => void load(true)} disabled={loading}>{loading ? "Обновляем…" : "Обновить данные ↻"}</button>
        </div>
      </section>

      <section className="report-workspace">
        {error && <div className="report-inline-error">Последнее обновление не удалось: {error}</div>}
        <div className="report-view-tabs" role="tablist" aria-label="Режим отчёта">
          <button className={view === "team" ? "active" : ""} onClick={() => setView("team")} role="tab" aria-selected={view === "team"}>Команда <span>Общая сводка</span></button>
          <button className={view === "teacher" ? "active" : ""} onClick={() => setView("teacher")} role="tab" aria-selected={view === "teacher"}>Преподаватель <span>Подробный отчёт</span></button>
        </div>

        {view === "team" ? (
          <div className="team-dashboard">
            <div className="report-summary-grid">
              <article className="report-summary-card report-summary-primary"><span>Преподавателей</span><strong>{data.summary.teachers}</strong><small>в объединённом отчёте</small></article>
              <article className="report-summary-card"><span className="summary-icon summary-icon-red">!</span><strong>{data.summary.red}</strong><small>требуют внимания</small></article>
              <article className="report-summary-card"><span className="summary-icon summary-icon-yellow">•</span><strong>{data.summary.yellow}</strong><small>нужно наблюдать</small></article>
              <article className="report-summary-card"><span className="summary-icon summary-icon-blue">↗</span><strong>{data.summary.groupsAtRisk}</strong><small>групп риска</small></article>
              <article className="report-summary-card"><span className="summary-icon summary-icon-green">✓</span><strong>{data.summary.mclassCoverage}%</strong><small>покрытие М.Класс</small></article>
            </div>

            <div className="team-insights-grid">
              <section className="report-panel team-kpi-panel">
                <div className="report-panel-title"><div><span className="report-kicker">СРЕДНИЕ ПО КОМАНДЕ</span><h2>Ключевые показатели</h2></div><span>текущая неделя</span></div>
                <div className="team-kpi-grid">{data.teamMetrics.map((item) => <MetricCard item={item} key={item.id} />)}</div>
              </section>
              <aside className="report-panel review-queue-panel">
                <div className="report-panel-title"><div><span className="report-kicker">ПРОВЕРКА РАБОТ</span><h2>Очередь команды</h2></div></div>
                <dl>
                  <div><dt>Работ на проверке</dt><dd>{data.summary.checks}</dd></div>
                  <div className={data.summary.overdue > 0 ? "queue-alert" : ""}><dt>Просрочено &gt;7 дней</dt><dd>{data.summary.overdue}</dd></div>
                  <div><dt>ТК на проверке</dt><dd>{data.summary.control}</dd></div>
                  <div><dt>Средний срок</dt><dd>{format(data.summary.reviewDays, "дн.")}</dd></div>
                </dl>
              </aside>
            </div>

            <section className="report-panel team-leads-panel">
              <div className="report-panel-title"><div><span className="report-kicker">СРАВНЕНИЕ КОМАНД</span><h2>Срез по тимлидам</h2></div><span>сортировка по красному статусу</span></div>
              <div className="team-lead-grid">{data.teamLeads.map((lead) => {
                const attentionShare = lead.teachers ? Math.round((lead.red + lead.yellow) / lead.teachers * 100) : 0;
                return <article key={lead.name} className="team-lead-card"><div><span>{lead.name}</span><strong>{lead.teachers} преподавателей</strong></div><div className="lead-progress"><i style={{ width: `${attentionShare}%` }} /></div><dl><div><dt>Красный</dt><dd>{lead.red}</dd></div><div><dt>Посещаемость</dt><dd>{format(lead.attendance, "%")}</dd></div><div><dt>Просрочено</dt><dd>{lead.overdue}</dd></div></dl></article>;
              })}</div>
            </section>

            <section className="report-panel priority-panel">
              <div className="priority-head">
                <div><span className="report-kicker">ПРИОРИТЕТ ВНИМАНИЯ</span><h2>Все преподаватели</h2><p>Сначала показываем тех, кому нужна помощь тимлида.</p></div>
                <div className="report-filters">
                  <label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя или фамилия" /></label>
                  <select value={teamLead} onChange={(event) => setTeamLead(event.target.value)} aria-label="Фильтр по тимлиду"><option value="all">Все тимлиды</option>{data.teamLeads.map((lead) => <option key={lead.name} value={lead.name}>{lead.name}</option>)}</select>
                  <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="Фильтр по статусу"><option value="all">Все статусы</option><option value="red">Требует внимания</option><option value="yellow">Нужно наблюдать</option><option value="green">В норме</option></select>
                </div>
              </div>
              <div className="teacher-table-wrap">
                <table className="teacher-table">
                  <thead><tr><th>Преподаватель</th><th>Статус</th><th>Посещ.</th><th>ДЗ</th><th>Непринятые</th><th>Просрочено</th><th>М.Класс</th><th>Риск-группы</th><th><span className="sr-only">Открыть</span></th></tr></thead>
                  <tbody>{filtered.map((teacher) => {
                    const get = (id: string) => [...teacher.metrics, ...teacher.mclassMetrics].find((item) => item.id === id);
                    return <tr key={teacher.id}>
                      <td><div className="teacher-cell"><span className="teacher-avatar">{initials(teacher.name)}</span><p><b>{teacher.name}</b><small>{teacher.teamLead} · {teacher.groupsCount} групп</small></p></div></td>
                      <td><span className={`report-status report-status-${teacher.overall}`}>{STATUS_LABEL[teacher.overall]}</span></td>
                      {["attendance", "homework", "rejected", "overdue", "presence"].map((id) => { const item = get(id); return <td key={id}><span className={`table-value table-value-${item?.status ?? "neutral"}`}>{format(item?.value ?? null, item?.unit)}</span></td>; })}
                      <td><b>{teacher.riskGroups.length}</b></td>
                      <td><button className="row-open" onClick={() => openTeacher(teacher)} aria-label={`Открыть отчёт: ${teacher.name}`}>→</button></td>
                    </tr>;
                  })}</tbody>
                </table>
                {!filtered.length && <div className="report-empty">По выбранным фильтрам преподавателей нет.</div>}
              </div>
            </section>
          </div>
        ) : (
          <div>
            <div className="teacher-picker-card">
              <label htmlFor="teacher-report-select"><span className="report-kicker">ПРЕПОДАВАТЕЛЬ</span>Выберите отчёт</label>
              <select id="teacher-report-select" value={selected?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>{data.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.teamLead}</option>)}</select>
            </div>
            {selected && <TeacherDetails teacher={selected} methodology={data.methodology} />}
          </div>
        )}
      </section>
    </>
  );
}
