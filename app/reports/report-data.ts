export type SignalStatus = "green" | "yellow" | "red" | "neutral";

export type ReportMetric = {
  id: string;
  label: string;
  value: number | null;
  unit: string;
  hint: string;
  status: SignalStatus;
};

export type TeacherReport = {
  id: string;
  name: string;
  teamLead: string;
  groupsCount: number;
  lessonsCount: number;
  overall: Exclude<SignalStatus, "neutral">;
  metrics: ReportMetric[];
  mclassMetrics: ReportMetric[];
  attention: ReportMetric[];
  riskGroups: { name: string; risks: string[] }[];
};

export type TeamLeadSummary = {
  name: string;
  teachers: number;
  red: number;
  yellow: number;
  attendance: number | null;
  overdue: number;
};

export type TeacherReportPayload = {
  generatedAt: string;
  methodology: string;
  summary: {
    teachers: number;
    red: number;
    yellow: number;
    green: number;
    groupsAtRisk: number;
    mclassCoverage: number;
    checks: number;
    overdue: number;
    control: number;
    reviewDays: number | null;
  };
  teamMetrics: ReportMetric[];
  teamLeads: TeamLeadSummary[];
  teachers: TeacherReport[];
};

type Row = Record<string, string>;

const clean = (value: unknown) => String(value ?? "").trim();
const numeric = (value: unknown) => {
  const normalized = clean(value).replace("%", "").replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};
const mean = (values: (number | null | undefined)[]) => {
  const valid = values.filter((value): value is number => Number.isFinite(value));
  return valid.length ? valid.reduce((total, value) => total + value, 0) / valid.length : null;
};
const total = (values: (number | null | undefined)[]) => values.reduce<number>((sum, value) => sum + (Number.isFinite(value) ? value! : 0), 0);
const round = (value: number | null, digits = 0) => value == null ? null : Number(value.toFixed(digits));
const keyPart = (value: unknown) => clean(value).toLocaleLowerCase("ru-RU").replaceAll("ё", "е").replace(/\s+/g, " ");
const teacherKey = (first: unknown, last: unknown) => `${keyPart(first)}|${keyPart(last)}`;
const ratio = (part: number, whole: number) => whole > 0 ? Math.min(part / whole, 1) * 100 : null;

export function parseCsv(input: string): Row[] {
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') { cell += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(cell); cell = ""; }
    else if (character === "\n") { row.push(cell.replace(/\r$/, "")); matrix.push(row); row = []; cell = ""; }
    else cell += character;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); matrix.push(row); }
  const [headers = [], ...rows] = matrix;
  return rows.filter((values) => values.some((value) => value.trim())).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), values[index]?.trim() ?? ""])),
  );
}

function statusFor(id: string, value: number | null): SignalStatus {
  if (value == null) return "neutral";
  if (id === "attendance") return value >= 75 ? "green" : value >= 60 ? "yellow" : "red";
  if (id === "homework") return value >= 60 ? "green" : value >= 40 ? "yellow" : "red";
  if (id === "rejected") return value <= 5 ? "green" : value <= 10 ? "yellow" : "red";
  if (id === "overdue") return value === 0 ? "green" : value <= 3 ? "yellow" : "red";
  if (id === "reviewDays") return value <= 3 ? "green" : value <= 7 ? "yellow" : "red";
  if (id === "control") return value === 0 ? "green" : value === 1 ? "yellow" : "red";
  if (id === "presence") return value >= 80 ? "green" : value >= 60 ? "yellow" : "red";
  return "neutral";
}

function metric(id: string, label: string, value: number | null | undefined, unit = "", hint = ""): ReportMetric {
  const normalized = value ?? null;
  return { id, label, value: round(normalized, unit === "%" ? 0 : 1), unit, hint, status: statusFor(id, normalized) };
}

export function buildTeacherReport(standardRows: Row[], mclassRows: Row[]): TeacherReportPayload {
  const standard = new Map<string, { firstName: string; lastName: string; teamLead: string; rows: Row[] }>();
  for (const row of standardRows) {
    const firstName = clean(row["Имя преп"]);
    const lastName = clean(row["Фамилия преп"]);
    if (!firstName && !lastName) continue;
    const key = teacherKey(firstName, lastName);
    const bucket = standard.get(key) ?? { firstName, lastName, teamLead: clean(row["ТЛ"]), rows: [] };
    bucket.rows.push(row);
    standard.set(key, bucket);
  }

  const lessons = new Map<string, { teacherKey: string; firstName: string; lastName: string; group: string; students: Row[] }>();
  for (const row of mclassRows) {
    const firstName = clean(row["Имя преп"]);
    const lastName = clean(row["Фамилия преп"]);
    const group = clean(row["Группа"]);
    if ((!firstName && !lastName) || !group) continue;
    const key = teacherKey(firstName, lastName);
    const lessonKey = `${key}|${keyPart(group)}`;
    const lesson = lessons.get(lessonKey) ?? { teacherKey: key, firstName, lastName, group, students: [] };
    lesson.students.push(row);
    lessons.set(lessonKey, lesson);
  }

  const mclass = new Map<string, { firstName: string; lastName: string; lessons: Record<string, number | null>[] }>();
  for (const lesson of lessons.values()) {
    const duration = total(lesson.students.map((row) => numeric(row["Длительность урока"])));
    const onLesson = total(lesson.students.map((row) => numeric(row["Время на уроке"])));
    const camera = total(lesson.students.map((row) => numeric(row["Время с камерой"])));
    const distractions = total(lesson.students.map((row) => numeric(row["Отвлечений"])));
    const stats = {
      presence: ratio(onLesson, duration),
      camera: ratio(camera, onLesson),
      meaningful: lesson.students.length ? lesson.students.filter((row) => (numeric(row["Количество сообщ >5 символов"]) ?? 0) > 0).length / lesson.students.length * 100 : null,
      microphone: lesson.students.length ? lesson.students.filter((row) => (numeric(row["Кол-во вкл. микро"]) ?? 0) > 0).length / lesson.students.length * 100 : null,
      reactions: mean(lesson.students.map((row) => numeric(row["Кол-во реакций"]) ?? 0)),
      activity: mean(lesson.students.map((row) => numeric(row["Баллы за активность"]))),
      distractions: onLesson > 0 ? distractions / onLesson * 60 : null,
    };
    const bucket = mclass.get(lesson.teacherKey) ?? { firstName: lesson.firstName, lastName: lesson.lastName, lessons: [] };
    bucket.lessons.push(stats);
    mclass.set(lesson.teacherKey, bucket);
  }

  const statusRank: Record<SignalStatus, number> = { neutral: 0, green: 0, yellow: 1, red: 2 };
  const keys = new Set([...standard.keys(), ...mclass.keys()]);
  const teachers: TeacherReport[] = [...keys].map((key) => {
    const source = standard.get(key);
    const classroom = mclass.get(key);
    const rows = source?.rows ?? [];
    const teacherLessons = classroom?.lessons ?? [];
    const values = {
      attendance: mean(rows.map((row) => numeric(row["%Посещ"]))),
      homework: mean(rows.map((row) => numeric(row["%ДЗ"]))),
      rejected: mean(rows.map((row) => numeric(row["%ДЗ непр"]))),
      checks: total(rows.map((row) => numeric(row["Тесты на проверке"]))),
      overdue: total(rows.map((row) => numeric(row["На проверке >7 дней"]))),
      reviewDays: mean(rows.map((row) => numeric(row["Ср дней проверки"]))),
      control: total(rows.map((row) => numeric(row["ТК на проверке"]))),
    };
    const metrics = [
      metric("attendance", "Посещаемость", values.attendance, "%"), metric("homework", "Выполнение ДЗ", values.homework, "%"),
      metric("rejected", "Непринятые ДЗ", values.rejected, "%"), metric("checks", "Работ на проверке", values.checks),
      metric("overdue", "Просрочено >7 дней", values.overdue), metric("reviewDays", "Средний срок проверки", values.reviewDays, "дн."),
      metric("control", "ТК на проверке", values.control),
    ];
    const mclassMetrics = [
      metric("presence", "Присутствие", mean(teacherLessons.map((item) => item.presence)), "%", "от длительности занятия"),
      metric("camera", "Камера", mean(teacherLessons.map((item) => item.camera)), "%", "от времени на занятии"),
      metric("meaningful", "Содержательные сообщения", mean(teacherLessons.map((item) => item.meaningful)), "%", "студентов с сообщением >5 символов"),
      metric("microphone", "Микрофон", mean(teacherLessons.map((item) => item.microphone)), "%", "студентов, включавших микрофон"),
      metric("reactions", "Реакции", mean(teacherLessons.map((item) => item.reactions)), "", "в среднем на студента"),
      metric("activity", "Баллы активности", mean(teacherLessons.map((item) => item.activity)), "", "в среднем на студента"),
      metric("distractions", "Отвлечения", mean(teacherLessons.map((item) => item.distractions)), "/ч", "на час присутствия"),
    ];
    const attention = metrics.filter((item) => item.status === "red" || item.status === "yellow").sort((a, b) => statusRank[b.status] - statusRank[a.status]);
    const thresholded = [...metrics, ...mclassMetrics].filter((item) => item.status !== "neutral");
    const overall = thresholded.some((item) => item.status === "red") ? "red" : thresholded.some((item) => item.status === "yellow") ? "yellow" : "green";
    const riskGroups = rows.map((row) => {
      const groupMetrics = [["attendance", numeric(row["%Посещ"])], ["homework", numeric(row["%ДЗ"])], ["rejected", numeric(row["%ДЗ непр"])]] as const;
      const risks = groupMetrics.filter(([id, value]) => statusFor(id, value) === "red").map(([id]) => id);
      return risks.length ? { name: clean(row["Кодировка"]) || "Группа без названия", risks } : null;
    }).filter((item): item is { name: string; risks: string[] } => item != null);
    return {
      id: key,
      name: [source?.firstName ?? classroom?.firstName, source?.lastName ?? classroom?.lastName].filter(Boolean).join(" "),
      teamLead: source?.teamLead || "Не указан",
      groupsCount: rows.length,
      lessonsCount: teacherLessons.length,
      overall,
      metrics,
      mclassMetrics,
      attention,
      riskGroups,
    };
  }).sort((a, b) => statusRank[b.overall] - statusRank[a.overall] || a.name.localeCompare(b.name, "ru"));

  const teacherMetric = (teacher: TeacherReport, id: string) => [...teacher.metrics, ...teacher.mclassMetrics].find((item) => item.id === id)?.value ?? null;
  const leadBuckets = new Map<string, TeacherReport[]>();
  for (const teacher of teachers) leadBuckets.set(teacher.teamLead, [...(leadBuckets.get(teacher.teamLead) ?? []), teacher]);
  const teamLeads = [...leadBuckets].map(([name, items]) => ({
    name,
    teachers: items.length,
    red: items.filter((item) => item.overall === "red").length,
    yellow: items.filter((item) => item.overall === "yellow").length,
    attendance: round(mean(items.map((item) => teacherMetric(item, "attendance"))), 0),
    overdue: total(items.map((item) => teacherMetric(item, "overdue"))),
  })).sort((a, b) => b.red - a.red || a.name.localeCompare(b.name, "ru"));

  const teamMetrics = [
    metric("attendance", "Посещаемость команды", mean(teachers.map((item) => teacherMetric(item, "attendance"))), "%", "среднее по преподавателям"),
    metric("homework", "Выполнение ДЗ", mean(teachers.map((item) => teacherMetric(item, "homework"))), "%", "только заполненные значения"),
    metric("rejected", "Непринятые ДЗ", mean(teachers.map((item) => teacherMetric(item, "rejected"))), "%", "среднее по преподавателям"),
    metric("presence", "Присутствие М.Класс", mean(teachers.map((item) => teacherMetric(item, "presence"))), "%", "среднее по занятиям преподавателей"),
    metric("camera", "Работа с камерой", mean(teachers.map((item) => teacherMetric(item, "camera"))), "%", "информационный показатель"),
    metric("activity", "Баллы активности", mean(teachers.map((item) => teacherMetric(item, "activity"))), "", "информационный показатель"),
  ];

  return {
    generatedAt: new Date().toISOString(),
    methodology: "М.Класс: студенты → занятие/группа → преподаватель",
    summary: {
      teachers: teachers.length,
      red: teachers.filter((item) => item.overall === "red").length,
      yellow: teachers.filter((item) => item.overall === "yellow").length,
      green: teachers.filter((item) => item.overall === "green").length,
      groupsAtRisk: teachers.reduce((sum, item) => sum + item.riskGroups.length, 0),
      mclassCoverage: teachers.length ? round(teachers.filter((item) => item.lessonsCount > 0).length / teachers.length * 100, 0)! : 0,
      checks: total(teachers.map((item) => teacherMetric(item, "checks"))),
      overdue: total(teachers.map((item) => teacherMetric(item, "overdue"))),
      control: total(teachers.map((item) => teacherMetric(item, "control"))),
      reviewDays: round(mean(teachers.map((item) => teacherMetric(item, "reviewDays"))), 1),
    },
    teamMetrics,
    teamLeads,
    teachers,
  };
}
