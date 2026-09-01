type TopNavProps = {
  active: "letters" | "schedule";
};

export function TopNav({ active }: TopNavProps) {
  const lettersHref = active === "schedule" ? "../" : "./";
  const scheduleHref = active === "schedule" ? "./" : "./schedule/";

  return (
    <header className="topbar">
      <a className="brand" href={lettersHref} aria-label="Макситет — внутренний сервис"><span>МАКСИТЕТ</span><i /></a>
      <nav className="main-nav" aria-label="Разделы сервиса">
        <a className={active === "letters" ? "active" : ""} href={lettersHref} aria-current={active === "letters" ? "page" : undefined}>Письма старта</a>
        <a className={active === "schedule" ? "active" : ""} href={scheduleHref} aria-current={active === "schedule" ? "page" : undefined}>Замены и переносы</a>
      </nav>
      <div className="snapshot"><span className="status-dot" /> Данные на 31 августа 2026</div>
    </header>
  );
}
