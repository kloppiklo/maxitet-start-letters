import { TopNav } from "../components/top-nav";

const STEPS = [
  { number: "01", title: "Найти замену", description: "Подобрать свободных преподавателей для одной профильной пары.", details: ["Та же дисциплина", "Свободен в этот слот", "Подходит формат и город"], action: "Открыть подбор" },
  { number: "02", title: "Найти время для переноса", description: "Получить несколько свободных слотов группы и предложить их преподавателю.", details: ["Понедельник–пятница", "Без наложений на другие пары", "Общеобразовательные занятия защищены"], action: "Подобрать слоты" },
] as const;

export default function SchedulePage() {
  return (
    <main>
      <TopNav active="schedule" />
      <section className="schedule-hero">
        <div><div className="eyebrow">РАСПИСАНИЕ · 2026/27</div><h1>Замены и переносы<br /><em>без ручного поиска</em></h1><p>Выберите задачу — сервис проверит расписание, чётность недели, формат занятия и город.</p></div>
        <div className="week-card" aria-label="Текущая учебная неделя"><span className="week-card-label">ТЕКУЩАЯ НЕДЕЛЯ</span><strong>Нечётная</strong><small>31 августа — 4 сентября</small></div>
      </section>
      <section className="schedule-workspace" aria-label="Действия с расписанием">
        <div className="schedule-actions">
          {STEPS.map((step) => <article className="schedule-action-card" key={step.number}><div className="action-number">{step.number}</div><h2>{step.title}</h2><p>{step.description}</p><ul>{step.details.map((detail) => <li key={detail}><span>✓</span>{detail}</li>)}</ul><button type="button">{step.action}<span aria-hidden="true">→</span></button></article>)}
        </div>
        <aside className="schedule-status-card"><div className="step-label">БАЗА РАСПИСАНИЯ</div><h2>Данные готовы</h2><p>Расписание приведено к единому формату и разделено на преподавателей, группы, занятые и свободные слоты.</p><dl><div><dt>Преподавателей</dt><dd>46</dd></div><div><dt>Компетенций</dt><dd>119</dd></div><div><dt>Групп</dt><dd>91</dd></div><div><dt>Свободных слотов</dt><dd>1 681</dd></div></dl><div className="protected-note"><span>●</span><p><b>Общеобразовательные пары защищены</b><small>Они остаются на месте и не предлагаются для замены.</small></p></div></aside>
      </section>
      <footer><span>МАКСИТЕТ · ВНУТРЕННИЙ СЕРВИС</span><span>Профильные дисциплины · Пн–Пт</span></footer>
    </main>
  );
}
