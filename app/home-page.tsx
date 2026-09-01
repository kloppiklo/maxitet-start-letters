import { TopNav } from "./components/top-nav";

const tools = [
  {
    number: "01",
    title: "Письма старта",
    description: "Соберите готовое письмо преподавателю с дисциплинами, группами, датами старта и нужными ссылками.",
    meta: "Преподаватели · Силлабусы · Чаты",
    href: "./letters/",
    className: "letters",
  },
  {
    number: "02",
    title: "Замены и переносы",
    description: "Найдите преподавателя для разовой замены или предложите свободные слоты для переноса занятия.",
    meta: "Занятость · Формат · Города",
    href: "./schedule/",
    className: "schedule",
  },
] as const;

export default function HomePage() {
  return (
    <main>
      <TopNav active="home" />

      <section className="portal-hero">
        <div className="portal-intro">
          <div className="eyebrow">ВНУТРЕННИЕ ИНСТРУМЕНТЫ · МАКСИТЕТ</div>
          <h1>Рабочие задачи<br /><em>в одном месте</em></h1>
          <p>Выберите нужный раздел — данные расписания и распределения уже загружены в сервис.</p>
        </div>
        <div className="portal-week">
          <span className="status-dot" />
          <div><small>Учебная неделя</small><strong>Нечётная</strong></div>
        </div>
      </section>

      <section className="portal-tools" aria-label="Инструменты сервиса">
        {tools.map((tool) => (
          <a className={`portal-tool-card ${tool.className}`} href={tool.href} key={tool.title}>
            <div className="portal-tool-top"><span>{tool.number}</span><i aria-hidden="true">↗</i></div>
            <div>
              <h2>{tool.title}</h2>
              <p>{tool.description}</p>
            </div>
            <small>{tool.meta}</small>
          </a>
        ))}
      </section>

      <section className="portal-note">
        <span>✓</span>
        <p><b>Общеобразовательные пары защищены</b><small>В расписании они учитываются как занятые и не предлагаются для переноса.</small></p>
      </section>

      <footer><span>МАКСИТЕТ · ВНУТРЕННИЙ СЕРВИС</span><span>Данные на 31 августа 2026</span></footer>
    </main>
  );
}
