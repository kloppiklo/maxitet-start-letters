type TopNavProps = {
  active: "home" | "letters" | "schedule";
};

export function TopNav({ active }: TopNavProps) {
  const homeHref = active === "home" ? "./" : "../";
  const lettersHref = active === "letters" ? "./" : active === "home" ? "./letters/" : "../letters/";
  const scheduleHref = active === "schedule" ? "./" : active === "home" ? "./schedule/" : "../schedule/";

  return (
    <header className="topbar">
      <a className="brand" href={homeHref} aria-label="Макситет — главная"><span>МАКСИТЕТ</span><i /></a>
      <nav className="main-nav" aria-label="Разделы сервиса">
        <a className={active === "home" ? "active" : ""} href={homeHref} aria-current={active === "home" ? "page" : undefined}>Главная</a>
        <a className={active === "letters" ? "active" : ""} href={lettersHref} aria-current={active === "letters" ? "page" : undefined}>Письма старта</a>
        <a className={active === "schedule" ? "active" : ""} href={scheduleHref} aria-current={active === "schedule" ? "page" : undefined}>Замены и переносы</a>
      </nav>
      <div className="snapshot"><span className="status-dot" /> Данные на 31 августа 2026</div>
    </header>
  );
}
