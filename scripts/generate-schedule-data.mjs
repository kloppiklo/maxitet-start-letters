import fs from "node:fs";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error("Usage: node scripts/generate-schedule-data.mjs <normalized_data.json> <output.ts>");
}

const source = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const compact = {
  parameters: source.parameters,
  teachers: source.teachers.map((item) => ({
    name: item.teacher,
    direction: item.direction,
    city: item.city,
    canOnsite: item.can_onsite === "Да",
    canOnline: item.can_online === "Да",
    weeklyLoad: item.weekly_load,
    ready: item.data_status === "Готово",
  })),
  competencies: source.competencies.map((item) => ({
    teacher: item.teacher,
    subject: item.subject,
    direction: item.direction,
    approved: item.approved === "Да",
  })),
  assignments: source.assignments.map((item) => ({
    id: item.assignment_id,
    subject: item.subject,
    direction: item.direction,
    group: item.group_code,
    city: item.city,
    mode: item.lesson_mode,
    lessonType: item.lesson_format,
    course: item.course,
    schedule: item.schedule_source,
    teacher: item.teacher,
    status: item.status,
  })),
  teacherBusy: source.teacher_busy.map((item) => ({
    teacher: item.teacher,
    week: item.week,
    day: item.day,
    time: item.time,
    lesson: item.lesson_text,
  })),
  groups: source.groups.map((item) => ({
    name: item.group,
    course: item.course,
    city: item.city,
    mode: item.group_mode,
  })),
  freeSlots: source.free_slots.map((item) => ({
    group: item.group,
    week: item.week,
    day: item.day,
    time: item.time,
  })),
};

const output = `// Generated from the normalized schedule workbook.\nexport const SCHEDULE_DATA = ${JSON.stringify(compact)} as const;\n`;
fs.writeFileSync(outputPath, output);
console.log(JSON.stringify({
  teachers: compact.teachers.length,
  assignments: compact.assignments.length,
  busy: compact.teacherBusy.length,
  groups: compact.groups.length,
  freeSlots: compact.freeSlots.length,
}));
