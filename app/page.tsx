"use client";

import { useMemo, useState } from "react";
import { DATA_SNAPSHOT } from "./data/generated";

type Assignment = (typeof DATA_SNAPSHOT.teachers)[number]["assignments"][number];

const MATERIALS = [
  ["1 курс — система оценивания и журнал оценок", "https://maximum02.sharepoint.com/:p:/s/college.maxitet/IQC0nlbLBJGeTKdMZCdx56-tAcG9UBhu54AF544EUWB5oOw?e=6ARf5q"],
  ["2 курс — система оценивания и журнал оценок", "https://maximum02.sharepoint.com/:p:/s/college.maxitet/IQB5rES31F4kRIO7QHqL6ClLAdWWobaCAN2QFbq2293kZVI?e=jEtTrn"],
  ["3 курс — система оценивания и журнал оценок", "https://maximum02.sharepoint.com/:p:/s/college.maxitet/IQBmH5dQ02sNR6KKPXdIICdIASguIWKXuwWhuQajgd_KcbA?e=y2k10M"],
  ["4 курс — система оценивания и журнал оценок", "https://maximum02.sharepoint.com/:p:/s/college.maxitet/IQDdaGxkSrNKRbF9R73fDvI6ARy7WiVnouhOl98OvIwm6iY?e=3sURc4"],
  ["Бланк анализа ОУ", "https://maximum02.sharepoint.com/:w:/s/college.maxitet/EVh-CXHiLM1Gvc_GidE2-kEBRBJltCFmPkZ-i1CyqsZAPg?e=ATvBdL"],
  ["Мини-гайд по М.Классу", "https://maximum02.sharepoint.com/:v:/s/college.maxitet/IQC_ogo7qkjnQIhnkZGpZIYxATznpYc9C-vwOTA7JqbSo08?e=v3N5Xu"],
] as const;

const KPI_SCREENSHOT_URL = "https://kloppiklo.github.io/maxitet-start-letters/kpi-rating.png";
const TELEGRAM_BOT_URL = "https://t.me/spomaxitetbot";

const TRAINING_CENTER_ADDRESSES: Record<string, string> = {
  "МСК": "МСК — ул. Покровка, 28, стр. 2",
  "СПБ": "СПБ — ул. Рубинштейна, 13",
  "НН": "НН — ул. Костина, 3",
  "ЕКБ": "ЕКБ — ул. Луначарского, 80",
  "ЕКТ": "ЕКБ — ул. Луначарского, 80",
};

const FRIENDLY_NAMES: Record<string, string> = {
  "Александра": "Саша",
  "Анастасия": "Настя",
  "Анна": "Аня",
  "Виктория": "Вика",
  "Владислав": "Влад",
  "Григорий": "Гриша",
  "Елена": "Лена",
  "Елизавета": "Лиза",
  "Иван": "Ваня",
  "Ирина": "Ира",
  "Ксения": "Ксюша",
  "Маргарита": "Рита",
  "Мария": "Маша",
  "Максим": "Макс",
  "Михаил": "Миша",
  "Наталия": "Наташа",
  "Павел": "Паша",
  "Светлана": "Света",
  "Сергей": "Серёжа",
  "Софья": "Соня",
  "Юлия": "Юля",
};

function friendlyGreetingName(teacher: (typeof DATA_SNAPSHOT.teachers)[number]) {
  if (FRIENDLY_NAMES[teacher.firstName]) return FRIENDLY_NAMES[teacher.firstName];
  const firstNameFromFullName = teacher.name
    .split(/[^А-ЯЁа-яё-]+/)
    .find((part) => FRIENDLY_NAMES[part]);
  return firstNameFromFullName ? FRIENDLY_NAMES[firstNameFromFullName] : teacher.firstName;
}

const DAY_INDEX: Record<string, number> = { вс: 0, пн: 1, вт: 2, ср: 3, чт: 4, пт: 5, сб: 6 };
const DAY_FULL = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

type Slot = { day: string; time: string; parity: "odd" | "even" | "both" };

function parseSchedule(schedule: string): Slot[] {
  const result: Slot[] = [];
  const dayMatches = [...schedule.matchAll(/(?<![а-яё])(пн|вт|ср|чт|пт|сб|вс)(?![а-яё])/gi)];
  for (let index = 0; index < dayMatches.length; index++) {
    const match = dayMatches[index];
    const day = match[1].toLowerCase();
    const blockStart = (match.index ?? 0) + match[0].length;
    const blockEnd = dayMatches[index + 1]?.index ?? schedule.length;
    const block = schedule.slice(blockStart, blockEnd);
    const times = [...block.matchAll(/(\d{1,2}:\d{2}-\d{1,2}:\d{2})/g)];
    for (let timeIndex = 0; timeIndex < times.length; timeIndex++) {
      const timeMatch = times[timeIndex];
      const qualifierStart = (timeMatch.index ?? 0) + timeMatch[0].length;
      const qualifierEnd = times[timeIndex + 1]?.index ?? block.length;
      const qualifier = block.slice(qualifierStart, qualifierEnd).toLowerCase();
      const parity = qualifier.includes("нечет/чет") || qualifier.includes("нечёт/чёт")
        ? "both" : /неч[её]т/.test(qualifier) ? "odd" : /ч[её]т/.test(qualifier) ? "even" : "both";
      result.push({ day, time: timeMatch[1], parity });
    }
  }
  return result;
}

function firstDate(schedule: string) {
  const slots = parseSchedule(schedule);
  const start = new Date(2026, 8, 2);
  const oddWeekMonday = new Date(2026, 7, 31);
  for (let offset = 0; offset < 42; offset++) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const weekIndex = Math.floor((date.getTime() - oddWeekMonday.getTime()) / 604800000);
    const parity = weekIndex % 2 === 0 ? "odd" : "even";
    if (slots.some((slot) => DAY_INDEX[slot.day] === date.getDay() && (slot.parity === "both" || slot.parity === parity))) {
      return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${DAY_FULL[date.getDay()]}`;
    }
  }
  return "дата не определена";
}

function resolveGroups(item: Assignment, warnings: string[]) {
  const chatInfos = item.chatInfos.length ? item.chatInfos : item.chatInfo ? [item.chatInfo] : [];
  if (!chatInfos.length) {
    warnings.push(`${item.subject}, ${item.group}: чат и куратор не найдены.`);
    return [{ group: item.group, curator: "—", chat: "—" }];
  }
  return chatInfos.map((chatInfo) => {
    const isStream = /потоковые лекции/i.test(chatInfo.group);
    if (!chatInfo.curator && !isStream) warnings.push(`${chatInfo.group}: куратор не указан.`);
    if (!chatInfo.chat) warnings.push(`${chatInfo.group}: ссылка на чат не указана.`);
    return {
      group: chatInfo.group,
      curator: chatInfo.curator || "—",
      chat: chatInfo.chat || "—",
    };
  });
}

function lessonFormat(item: Assignment) {
  const online = /онлайн/i.test(item.status) || /только онлайн/i.test(item.teacherFormat);
  if (/все группы/i.test(item.group)) return online ? "онлайн-потоковая лекция" : "очная потоковая лекция";
  return online ? "онлайн-семинар" : "очно, семинар";
}

function trainingCenterAddress(item: Assignment, group: string) {
  if (!lessonFormat(item).startsWith("очно")) return "";
  const city = group.toUpperCase().match(/^([А-ЯЁA-Z]+)/)?.[1] ?? "";
  return TRAINING_CENTER_ADDRESSES[city] ?? "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function richifyLetter(letter: string, linkLabels: Map<string, string>) {
  const urlPattern = /https?:\/\/[^\s]+/g;
  let html = "";
  let cursor = 0;
  for (const match of letter.matchAll(urlPattern)) {
    const url = match[0];
    const index = match.index ?? 0;
    html += escapeHtml(letter.slice(cursor, index));
    html += `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(linkLabels.get(url) ?? "Открыть ссылку")}</a>`;
    cursor = index + url.length;
  }
  html += escapeHtml(letter.slice(cursor));
  return html
    .replace(
      "\n\nПо любым вопросам всегда на связи!",
      `\n\n<img src="${KPI_SCREENSHOT_URL}" alt="Пример рейтинга преподавателей" width="900" style="display:block;width:100%;max-width:900px;height:auto;border:0;margin:8px 0">\n\nПо любым вопросам всегда на связи!`,
    )
    .replaceAll("\n", "<br>")
    .replace(/(^|<br>)(Данные по старту дисциплины «.*?»:)(?=<br>)/g, "$1<strong>$2</strong>");
}

function buildLetter(teacher: (typeof DATA_SNAPSHOT.teachers)[number]) {
  const warnings: string[] = [];
  const excluded = teacher.assignments.filter((item) => !item.confirmed);
  if (excluded.length) warnings.push(`${excluded.length} назначение исключено: требуется согласование.`);
  const active = teacher.assignments.filter((item) => item.confirmed);
  const sections = new Map<string, Assignment[]>();
  for (const item of active) {
    const key = item.subject.toLowerCase().startsWith("подготовка к государственному") ? "Подготовка к государственному экзамену" : item.subject;
    if (!sections.has(key)) sections.set(key, []);
    sections.get(key)!.push(item);
  }

  const subjectList = [...sections.keys()].map((subject, index) => `${index + 1}. ${subject}`).join("\n");
  const blocks = [...sections.entries()].map(([subject, items]) => {
    const candidates = items.flatMap((item) => [...item.syllabusCandidates]);
    const courses = [...new Set(items.map((item) => item.course))];
    const links = [...new Set(candidates.map((candidate) => candidate.link).filter(Boolean))];
    if (!candidates.length) warnings.push(`${subject}: силлабус не найден.`);
    if (courses.length > 1) warnings.push(`${subject}: найдено несколько курсов — ${courses.join(", ")}.`);
    if (links.length > 1) warnings.push(`${subject}: найдено несколько ссылок на силлабус.`);
    const groupLines = items.flatMap((item) => resolveGroups(item, warnings).map((group) => {
      const address = trainingCenterAddress(item, group.group);
      return `Группа: ${group.group}\nКуратор группы: ${group.curator}\nСсылка на чат: ${group.chat}\nДата старта: ${firstDate(item.schedule)}\nРасписание: ${item.schedule}\nФормат: ${lessonFormat(item)}${address ? `\nАдрес УЦ: ${address}` : ""}`;
    }));
    const fourthCourseNote = courses.includes(4) ? "\nВажно: 4 курс — сокращённый курс продолжительностью 2 месяца." : "";
    return `Данные по старту дисциплины «${subject}»:\nКурс: ${courses.length === 1 ? courses[0] : courses.join("/") || "—"}${fourthCourseNote}\n${groupLines.join("\n\n")}\nСсылка на силлабус: ${links[0] || "—"}`;
  }).join("\n\n");

  const materials = MATERIALS.map(([title, link]) => `• ${title}: ${link}`).join("\n");
const letter = `${friendlyGreetingName(teacher)}, привет!\n\nВажно: сохрани себе силлабус и материалы из него на ближайшие пары. Скоро у нас будет переезд почты и всех файлов, поэтому лучше скачать всё необходимое заранее.\n\nОбязательно добавься в нашего Telegram-бота и отправь ему команду /start, даже если ты уже общался(-ась) с ботом. Это нужно, чтобы бот добавил тебя в базу для рассылок: ${TELEGRAM_BOT_URL}\n\nСовсем скоро у тебя стартуют группы по:\n${subjectList}\n\nВ этом письме предлагаю синхронизироваться по основным моментам.\n\n${blocks}\n\n! Стартуем с нечётной недели !\n\nЗа день до старта проверяем основные аспекты.\nЛичный кабинет:\n• группа подключена\n• при необходимости — переименовать группу в разделе «Управление группами» для более удобной ориентации в ЛК\n• расписание и контент курса отображаются корректно\n\nПосле старта:\n• проверить, что ты состоишь в чате со студентами\n\nТакже делюсь дополнительными материалами, необходимыми для работы:\n${materials}\n\nКаждый семестр мы сводим рейтинг преподавателей, в котором будут учтены следующие KPI:\n• оценка за открытый урок не ниже 5\n• посещаемость студентов не ниже 75%, ДЗ — не ниже 80% в среднем\n• очки активности студентов в М.Классе — не ниже 150 очков в среднем\n• место в рейтинге также зависит от нагрузки: чем она выше, тем выше показатель\n\nПо любым вопросам всегда на связи!\nУспешного старта!`;
  const linkLabels = new Map<string, string>();
  for (const items of sections.values()) {
    for (const candidate of items.flatMap((item) => [...item.syllabusCandidates])) {
      if (candidate.link) linkLabels.set(candidate.link, "Открыть силлабус");
    }
    for (const item of items) {
      const chatInfos = item.chatInfos.length ? item.chatInfos : item.chatInfo ? [item.chatInfo] : [];
      for (const chatInfo of chatInfos) {
        for (const match of chatInfo.chat.matchAll(/https?:\/\/[^\s]+/g)) {
          linkLabels.set(match[0], "Открыть чат группы");
        }
      }
    }
  }
  for (const [, link] of MATERIALS) linkLabels.set(link, "Открыть материал");
  linkLabels.set(TELEGRAM_BOT_URL, "@spomaxitetbot");
  return { letter, letterHtml: richifyLetter(letter, linkLabels), warnings: [...new Set(warnings)] };
}

function copyFormattedHtml(html: string, plainText: string) {
  let copied = false;
  const handleCopy = (event: ClipboardEvent) => {
    if (!event.clipboardData) return;
    event.preventDefault();
    event.clipboardData.setData("text/html", html);
    event.clipboardData.setData("text/plain", plainText);
    copied = true;
  };

  document.addEventListener("copy", handleCopy);
  try {
    document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    document.removeEventListener("copy", handleCopy);
  }
  return copied;
}

export default function Home() {
  const defaultTeacher = DATA_SNAPSHOT.teachers.find((teacher) => teacher.name === "Молодцов Павел") ?? DATA_SNAPSHOT.teachers[0];
  const [query, setQuery] = useState(defaultTeacher.name);
  const [selectedName, setSelectedName] = useState(defaultTeacher.name);
  const [copied, setCopied] = useState(false);
  const teacher = DATA_SNAPSHOT.teachers.find((item) => item.name === selectedName) ?? defaultTeacher;
  const result = useMemo(() => buildLetter(teacher), [teacher]);

  const selectTeacher = () => {
    const normalized = query.trim().toLowerCase();
    const exact = DATA_SNAPSHOT.teachers.find((item) => item.name.toLowerCase() === normalized);
    const partial = DATA_SNAPSHOT.teachers.find((item) => item.name.toLowerCase().includes(normalized));
    if (exact || partial) setSelectedName((exact || partial)!.name);
  };

  const copyLetter = async () => {
    const richLetter = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#1f2430">${result.letterHtml}</div>`;
    let copied = copyFormattedHtml(richLetter, result.letter);

    if (!copied && typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([result.letter], { type: "text/plain" }),
            "text/html": new Blob([richLetter], { type: "text/html" }),
          }),
        ]);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (!copied) {
      await navigator.clipboard.writeText(result.letter);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Макситет — стартовые письма"><span>МАКСИТЕТ</span><i /></a>
        <div className="snapshot"><span className="status-dot" /> Данные на 25 августа 2026</div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow">СТАРТ СЕМЕСТРА · 2026/27</div>
        <h1>Письмо преподавателю<br /><em>за несколько секунд</em></h1>
        <p>Введите имя — сервис соберёт дисциплины, группы, первые даты занятий и ссылки на силлабусы.</p>
      </section>

      <section className="workspace" aria-label="Генератор письма">
        <aside className="controls-card">
          <div className="step-label">01 / ПРЕПОДАВАТЕЛЬ</div>
          <label htmlFor="teacher">Имя или фамилия</label>
          <div className="search-row">
            <input id="teacher" list="teachers" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && selectTeacher()} placeholder="Например, Паша Молодцов" />
            <button className="search-button" onClick={selectTeacher} aria-label="Найти преподавателя">→</button>
          </div>
          <datalist id="teachers">
            {DATA_SNAPSHOT.teachers.map((item) => <option key={item.name} value={item.name} />)}
          </datalist>

          <div className="facts">
            <div><span>Старт</span><strong>2 сентября</strong><small>среда</small></div>
            <div><span>Неделя</span><strong>Нечётная</strong><small>первая</small></div>
            <div><span>Нагрузка</span><strong>{teacher.assignments.filter((item) => item.confirmed).reduce((sum, item) => sum + item.load, 0)} ч</strong><small>в неделю</small></div>
          </div>

          <div className="source-list">
            <div><span>✓</span><p><b>Распределение</b><small>{teacher.assignments.length} назначений найдено</small></p></div>
            <div><span>✓</span><p><b>Силлабусы</b><small>ссылки добавлены автоматически</small></p></div>
            <div><span>✓</span><p><b>Чаты и кураторы</b><small>добавлены по курсу и группе</small></p></div>
          </div>

          {result.warnings.length > 0 && (
            <div className="warning-box">
              <b>Нужно проверить · {result.warnings.length}</b>
              <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </div>
          )}
        </aside>

        <article className="letter-card">
          <div className="letter-toolbar">
            <div><span className="ready-dot" /><b>{result.warnings.length ? "Готово с уточнениями" : "Готово к отправке"}</b></div>
            <button onClick={copyLetter}>{copied ? "Скопировано ✓" : "Скопировать письмо"}</button>
          </div>
          <div className="paper">
            <div className="rich-letter" dangerouslySetInnerHTML={{ __html: result.letterHtml }} />
          </div>
        </article>
      </section>

      <footer><span>МАКСИТЕТ · ВНУТРЕННИЙ СЕРВИС</span><span>{DATA_SNAPSHOT.teachers.length} преподавателей в базе</span></footer>
    </main>
  );
}
