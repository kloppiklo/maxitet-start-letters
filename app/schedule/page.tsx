"use client";

import { Fragment, useMemo, useState } from "react";
import { TopNav } from "../components/top-nav";
import { SCHEDULE_DATA } from "../data/schedule.generated";

type Flow = "replacement" | "transfer";
type Week = "Нечётная" | "Чётная";

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт"] as const;
const TIMES = ["10:00-11:30", "12:00-13:30", "14:00-15:30", "15:40-17:10", "17:20-18:50", "19:00-20:30"] as const;
const DAY_INDEX: Record<string, number> = Object.fromEntries(DAYS.map((day, index) => [day, index]));

function normalize(value: string) {
  return value.toLowerCase().replaceAll("ё", "е").replace(/[^a-zа-я0-9]+/g, " ").trim();
}

function lessonMatchesSubject(lesson: string, subject: string) {
  const lessonText = normalize(lesson);
  const subjectText = normalize(subject);
  const core = subjectText.split(" ").filter((word) => word.length > 3).slice(0, 3);
  return lessonText.includes(subjectText) || subjectText.includes(lessonText) || (core.length > 0 && core.every((word) => lessonText.includes(word)));
}

function parseScheduleSlots(schedule: string) {
  const slots: { week: Week; day: string; time: string }[] = [];
  const dayMatches = [...schedule.matchAll(/(?<![а-яё])(пн|вт|ср|чт|пт)(?![а-яё])/gi)];
  for (let index = 0; index < dayMatches.length; index++) {
    const match = dayMatches[index];
    const day = `${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()}`;
    const start = (match.index ?? 0) + match[0].length;
    const end = dayMatches[index + 1]?.index ?? schedule.length;
    const block = schedule.slice(start, end);
    for (const timeMatch of block.matchAll(/\d{1,2}:\d{2}-\d{1,2}:\d{2}/g)) {
      const tail = block.slice((timeMatch.index ?? 0) + timeMatch[0].length).toLowerCase();
      const both = /неч[её]т\s*\/\s*ч[её]т/.test(tail);
      if (both || /неч[её]т/.test(tail)) slots.push({ week: "Нечётная", day, time: timeMatch[0] });
      if (both || /(?<!не)ч[её]т/.test(tail)) slots.push({ week: "Чётная", day, time: timeMatch[0] });
      if (!/неч[её]т|ч[её]т/.test(tail)) slots.push({ week: "Нечётная", day, time: timeMatch[0] }, { week: "Чётная", day, time: timeMatch[0] });
    }
  }
  return slots;
}

function uniqueSlots<T extends { week: string; day: string; time: string }>(items: T[]) {
  return items.filter((item, index) => items.findIndex((candidate) => candidate.week === item.week && candidate.day === item.day && candidate.time === item.time) === index);
}

const assignedTeachers = [...new Set(SCHEDULE_DATA.assignments.filter((item) => item.teacher && item.status === "Назначено").map((item) => item.teacher))].sort((a, b) => a.localeCompare(b, "ru"));
const defaultTeacher = assignedTeachers.find((name) => name === "Петушкова Ксения") ?? assignedTeachers[0];
const defaultAssignment = SCHEDULE_DATA.assignments.find((item) => item.teacher === defaultTeacher && item.status === "Назначено") ?? SCHEDULE_DATA.assignments[0];

function slotsForAssignment(assignment: (typeof SCHEDULE_DATA.assignments)[number]) {
  const fromGrid = SCHEDULE_DATA.teacherBusy
    .filter((item) => item.teacher === assignment.teacher && lessonMatchesSubject(item.lesson, assignment.subject))
    .map(({ week, day, time }) => ({ week: week as Week, day, time }));
  return uniqueSlots(fromGrid.length ? fromGrid : parseScheduleSlots(assignment.schedule));
}

const initialSlot = slotsForAssignment(defaultAssignment)[0] ?? { week: "Нечётная" as Week, day: "Пн", time: "10:00-11:30" };
const defaultGroup = SCHEDULE_DATA.groups.find((group) => group.name === "МСК 1-26 Дизайн")?.name ?? SCHEDULE_DATA.groups[0].name;

export default function SchedulePage() {
  const [flow, setFlow] = useState<Flow>("replacement");
  const [teacherName, setTeacherName] = useState(defaultTeacher);
  const [assignmentId, setAssignmentId] = useState(defaultAssignment.id);
  const [week, setWeek] = useState<Week>(initialSlot.week);
  const [day, setDay] = useState(initialSlot.day);
  const [time, setTime] = useState(initialSlot.time);
  const [groupName, setGroupName] = useState(defaultGroup);
  const [transferWeek, setTransferWeek] = useState<Week>("Нечётная");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const teacherAssignments = useMemo(() => SCHEDULE_DATA.assignments.filter((item) => item.teacher === teacherName && item.status === "Назначено"), [teacherName]);
  const assignment = SCHEDULE_DATA.assignments.find((item) => item.id === assignmentId) ?? teacherAssignments[0] ?? defaultAssignment;
  const assignmentSlots = useMemo(() => slotsForAssignment(assignment), [assignment]);

  const candidates = useMemo(() => {
    const competencyNames = new Set(SCHEDULE_DATA.competencies.filter((item) => item.approved && normalize(item.subject) === normalize(assignment.subject)).map((item) => item.teacher));
    return SCHEDULE_DATA.teachers
      .filter((teacher) => teacher.ready && teacher.name !== teacherName && competencyNames.has(teacher.name))
      .filter((teacher) => assignment.mode === "Онлайн" ? teacher.canOnline : teacher.canOnsite && teacher.city.split(", ").includes(assignment.city))
      .filter((teacher) => !SCHEDULE_DATA.teacherBusy.some((busy) => busy.teacher === teacher.name && busy.week === week && busy.day === day && busy.time === time))
      .map((teacher) => {
        const sameDirection = teacher.direction.includes(assignment.direction);
        const sameCity = teacher.city.split(", ").includes(assignment.city);
        const score = (sameDirection ? 10 : 0) + (sameCity ? 5 : 0) - Number(teacher.weeklyLoad || 0) / 10;
        return { ...teacher, score };
      })
      .sort((a, b) => b.score - a.score || Number(a.weeklyLoad) - Number(b.weeklyLoad));
  }, [assignment, teacherName, week, day, time]);

  const freeSlots = useMemo(() => SCHEDULE_DATA.freeSlots
    .filter((slot) => slot.group === groupName && slot.week === transferWeek)
    .sort((a, b) => (DAY_INDEX[a.day] ?? 9) - (DAY_INDEX[b.day] ?? 9) || a.time.localeCompare(b.time)), [groupName, transferWeek]);

  const freeSlotKeys = useMemo(() => new Set(freeSlots.map((slot) => `${slot.day}|${slot.time}`)), [freeSlots]);

  const changeTeacher = (nextTeacher: string) => {
    setTeacherName(nextTeacher);
    const nextAssignment = SCHEDULE_DATA.assignments.find((item) => item.teacher === nextTeacher && item.status === "Назначено");
    if (!nextAssignment) return;
    setAssignmentId(nextAssignment.id);
    const nextSlot = slotsForAssignment(nextAssignment)[0];
    if (nextSlot) { setWeek(nextSlot.week); setDay(nextSlot.day); setTime(nextSlot.time); }
  };

  const changeAssignment = (nextId: string) => {
    setAssignmentId(nextId);
    const nextAssignment = SCHEDULE_DATA.assignments.find((item) => item.id === nextId);
    const nextSlot = nextAssignment ? slotsForAssignment(nextAssignment)[0] : null;
    if (nextSlot) { setWeek(nextSlot.week); setDay(nextSlot.day); setTime(nextSlot.time); }
  };

  const chooseAssignmentSlot = (value: string) => {
    const [nextWeek, nextDay, nextTime] = value.split("|");
    setWeek(nextWeek as Week); setDay(nextDay); setTime(nextTime);
  };

  const changeGroup = (value: string) => { setGroupName(value); setSelectedSlots([]); setCopied(false); };
  const changeTransferWeek = (value: Week) => { setTransferWeek(value); setSelectedSlots([]); setCopied(false); };
  const toggleSlot = (key: string) => setSelectedSlots((current) => current.includes(key) ? current.filter((item) => item !== key) : current.length < 5 ? [...current, key] : current);

  const copyTransferOptions = async () => {
    const chosen = freeSlots.filter((slot) => selectedSlots.includes(`${slot.day}|${slot.time}`));
    if (!chosen.length) return;
    const text = `Свободные варианты для группы ${groupName}, ${transferWeek.toLowerCase()} неделя:\n${chosen.map((slot, index) => `${index + 1}. ${slot.day}, ${slot.time}`).join("\n")}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main>
      <TopNav active="schedule" />
      <section className="tool-heading">
        <div><div className="eyebrow">РАСПИСАНИЕ · 2026/27</div><h1>Замены и переносы</h1><p>Работаем только с профильными дисциплинами. Общеобразовательные пары остаются на месте и блокируют слот.</p></div>
        <div className="week-pill"><span>Текущая неделя</span><strong>Нечётная</strong></div>
      </section>

      <section className="schedule-tool">
        <div className="flow-tabs" role="tablist" aria-label="Сценарий работы">
          <button className={flow === "replacement" ? "active" : ""} onClick={() => setFlow("replacement")} role="tab" aria-selected={flow === "replacement"}><span>01</span>Найти замену</button>
          <button className={flow === "transfer" ? "active" : ""} onClick={() => setFlow("transfer")} role="tab" aria-selected={flow === "transfer"}><span>02</span>Найти время для переноса</button>
        </div>

        {flow === "replacement" ? (
          <div className="tool-grid">
            <aside className="tool-filters">
              <div className="step-label">РАЗОВАЯ ЗАМЕНА</div>
              <label>Кто не сможет провести пару<select value={teacherName} onChange={(event) => changeTeacher(event.target.value)}>{assignedTeachers.map((name) => <option key={name}>{name}</option>)}</select></label>
              <label>Занятие<select value={assignment.id} onChange={(event) => changeAssignment(event.target.value)}>{teacherAssignments.map((item) => <option key={item.id} value={item.id}>{item.subject} · {item.group}</option>)}</select></label>
              <label>Конкретный слот<select value={`${week}|${day}|${time}`} onChange={(event) => chooseAssignmentSlot(event.target.value)}>{assignmentSlots.map((slot) => <option key={`${slot.week}|${slot.day}|${slot.time}`} value={`${slot.week}|${slot.day}|${slot.time}`}>{slot.week} · {slot.day} · {slot.time}</option>)}{!assignmentSlots.length && <option value={`${week}|${day}|${time}`}>{week} · {day} · {time}</option>}</select></label>
              <div className="lesson-summary"><span>{assignment.mode} · {assignment.city}</span><strong>{assignment.subject}</strong><small>{assignment.group} · {assignment.lessonType}</small></div>
            </aside>

            <div className="tool-results">
              <div className="result-heading"><div><span className="ready-dot" /><b>Подходят для замены</b></div><strong>{candidates.length}</strong></div>
              {candidates.length ? <div className="candidate-list">{candidates.map((candidate, index) => <article className="candidate-card" key={candidate.name}><div className="candidate-rank">{index + 1}</div><div className="candidate-main"><h3>{candidate.name}</h3><p>{candidate.direction} · {candidate.city}</p><div className="candidate-reasons"><span>Свободен</span><span>Ведёт дисциплину</span>{assignment.mode === "Очно" && <span>Тот же город</span>}</div></div><div className="candidate-load"><small>Нагрузка</small><strong>{candidate.weeklyLoad} ч</strong></div></article>)}</div> : <div className="empty-result"><strong>Свободных преподавателей не найдено</strong><p>Попробуйте другой слот или добавьте преподавателю допуск на дисциплину в таблице компетенций.</p></div>}
              <div className="result-footnote">Проверено: дисциплина, занятость, формат занятия и город. Суббота не используется.</div>
            </div>
          </div>
        ) : (
          <div className="tool-grid">
            <aside className="tool-filters">
              <div className="step-label">ПЕРЕНОС ЗАНЯТИЯ</div>
              <label>Группа<select value={groupName} onChange={(event) => changeGroup(event.target.value)}>{SCHEDULE_DATA.groups.map((group) => <option key={group.name} value={group.name}>{group.name}</option>)}</select></label>
              <label>Неделя<select value={transferWeek} onChange={(event) => changeTransferWeek(event.target.value as Week)}><option>Нечётная</option><option>Чётная</option></select></label>
              <div className="transfer-rule"><b>Что проверяем</b><p>Только свободное время группы. Занятость преподавателя не исключает варианты — он сам выбирает подходящий слот.</p></div>
              <div className="selection-count"><span>Выбрано вариантов</span><strong>{selectedSlots.length} / 5</strong></div>
              <button className="copy-slots" onClick={copyTransferOptions} disabled={!selectedSlots.length}>{copied ? "Скопировано ✓" : "Скопировать варианты"}</button>
            </aside>

            <div className="tool-results">
              <div className="result-heading"><div><span className="ready-dot" /><b>Свободные слоты группы</b></div><strong>{freeSlots.length}</strong></div>
              {freeSlots.length ? (
                <div className="week-grid-scroll">
                  <div className="week-grid" role="grid" aria-label={`Свободные слоты группы ${groupName}, ${transferWeek.toLowerCase()} неделя`}>
                    <div className="week-grid-corner" role="columnheader">Время</div>
                    {DAYS.map((weekDay) => <div className="week-grid-day" role="columnheader" key={weekDay}>{weekDay}</div>)}
                    {TIMES.map((slotTime) => (
                      <Fragment key={slotTime}>
                        <div className="week-grid-time" role="rowheader">{slotTime}</div>
                        {DAYS.map((weekDay) => {
                          const key = `${weekDay}|${slotTime}`;
                          const available = freeSlotKeys.has(key);
                          const selected = selectedSlots.includes(key);
                          if (!available) return <div className="week-slot occupied" role="gridcell" key={key} aria-label={`${weekDay}, ${slotTime}: занято`}><span>—</span><small>Занято</small></div>;
                          return <button className={selected ? "week-slot available selected" : "week-slot available"} role="gridcell" key={key} onClick={() => toggleSlot(key)} aria-pressed={selected} disabled={!selected && selectedSlots.length >= 5} aria-label={`${weekDay}, ${slotTime}: ${selected ? "выбрано" : "свободно"}`}><span>{selected ? "✓" : "+"}</span><small>{selected ? "Выбрано" : "Свободно"}</small></button>;
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
              ) : <div className="empty-result"><strong>Свободных слотов нет</strong><p>В выбранной неделе все доступные интервалы группы заняты.</p></div>}
              <div className="result-footnote">Общеобразовательные и профильные пары уже учтены как занятые. Выберите до пяти вариантов для преподавателя.</div>
            </div>
          </div>
        )}
      </section>

      <footer><span>МАКСИТЕТ · ВНУТРЕННИЙ СЕРВИС</span><span>46 преподавателей · 91 группа</span></footer>
    </main>
  );
}
