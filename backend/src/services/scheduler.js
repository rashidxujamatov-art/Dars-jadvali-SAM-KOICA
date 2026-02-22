import { AppError, ERROR_CODES } from '../utils/errors.js';
import { sortSubjects, validateInputs } from '../domain/validation.js';

const PAIRS_PER_DAY = 5;

function subjectBlockPairs(subject) {
  return subject.type === 'PRACTICAL' ? 3 : 1;
}

function subjectNeededBlocks(subject) {
  return subject.type === 'PRACTICAL' ? subject.total_hours / 6 : subject.total_hours / 2;
}

function canPlace({ entry, entries, group, teacher, blockedDay, subject, weeklyGroupHours, dailyGroupHours, weeklyTeacherHours, dailyTeacherHours }) {
  if (!blockedDay || blockedDay.max_pairs === 0) return { ok: false, code: ERROR_CODES.CANNOT_SCHEDULE };
  if (entry.pair_start + entry.pair_length - 1 > blockedDay.max_pairs) return { ok: false, code: ERROR_CODES.CANNOT_SCHEDULE };

  for (let p = entry.pair_start; p < entry.pair_start + entry.pair_length; p++) {
    const overlap = entries.find((e) => e.week_number === entry.week_number && e.day === entry.day && p >= e.pair_start && p < e.pair_start + e.pair_length);
    if (overlap?.group_id === entry.group_id) return { ok: false, code: ERROR_CODES.GROUP_CONFLICT };
    if (overlap?.teacher_id === entry.teacher_id) return { ok: false, code: ERROR_CODES.TEACHER_CONFLICT };
  }

  const addHours = entry.pair_length * 2;
  const groupDay = dailyGroupHours[`${entry.week_number}-${entry.group_id}-${entry.day}`] || 0;
  const groupWeek = weeklyGroupHours[`${entry.week_number}-${entry.group_id}`] || 0;
  const teacherDay = dailyTeacherHours[`${entry.week_number}-${entry.teacher_id}-${entry.day}`] || 0;
  const teacherWeek = weeklyTeacherHours[`${entry.week_number}-${entry.teacher_id}`] || 0;

  if (groupDay + addHours > group.daily_limit_max) return { ok: false, code: ERROR_CODES.DAILY_LIMIT_EXCEEDED };
  if (groupWeek + addHours > group.weekly_limit_max) return { ok: false, code: ERROR_CODES.WEEKLY_LIMIT_EXCEEDED };
  if (teacherDay + addHours > teacher.max_daily_hours) return { ok: false, code: ERROR_CODES.DAILY_LIMIT_EXCEEDED };
  if (teacherWeek + addHours > teacher.max_weekly_hours) return { ok: false, code: ERROR_CODES.WEEKLY_LIMIT_EXCEEDED };

  if (subject.type === 'PRACTICAL') {
    const prevDay = entries.some((e) => e.subject_id === subject.id && e.week_number === entry.week_number && Math.abs(e.day - entry.day) === 1);
    if (prevDay) return { ok: false, code: ERROR_CODES.CANNOT_SCHEDULE };
  }

  if (subject.type === 'THEORY' && ![1, 4].includes(entry.pair_start)) return { ok: false, code: ERROR_CODES.CANNOT_SCHEDULE };

  return { ok: true };
}

export function generateSchedule({ groups, teachers, subjects, blockedDays, existingEntries = [] }) {
  validateInputs({ groups, subjects, blockedDays });
  const sorted = sortSubjects(subjects);
  const entries = [...existingEntries];
  const weeklyGroupHours = {};
  const dailyGroupHours = {};
  const weeklyTeacherHours = {};
  const dailyTeacherHours = {};

  const bump = (entry) => {
    const add = entry.pair_length * 2;
    weeklyGroupHours[`${entry.week_number}-${entry.group_id}`] = (weeklyGroupHours[`${entry.week_number}-${entry.group_id}`] || 0) + add;
    dailyGroupHours[`${entry.week_number}-${entry.group_id}-${entry.day}`] = (dailyGroupHours[`${entry.week_number}-${entry.group_id}-${entry.day}`] || 0) + add;
    weeklyTeacherHours[`${entry.week_number}-${entry.teacher_id}`] = (weeklyTeacherHours[`${entry.week_number}-${entry.teacher_id}`] || 0) + add;
    dailyTeacherHours[`${entry.week_number}-${entry.teacher_id}-${entry.day}`] = (dailyTeacherHours[`${entry.week_number}-${entry.teacher_id}-${entry.day}`] || 0) + add;
  };

  entries.forEach(bump);

  for (const subject of sorted) {
    const needed = subjectNeededBlocks(subject);
    const pairLength = subjectBlockPairs(subject);

    for (let b = 0; b < needed; b++) {
      let assigned = false;
      for (let week = 1; week <= 52 && !assigned; week++) {
        for (let day = 1; day <= 6 && !assigned; day++) {
          const blockedDay = blockedDays.find((d) => d.day === day);
          for (let pair = 1; pair <= PAIRS_PER_DAY && !assigned; pair++) {
            const entry = {
              group_id: subject.group_id,
              teacher_id: subject.teacher_id,
              subject_id: subject.id,
              day,
              pair_start: pair,
              pair_length: pairLength,
              week_number: week
            };
            const group = groups.find((g) => g.id === subject.group_id);
            const teacher = teachers.find((t) => t.id === subject.teacher_id);
            const result = canPlace({ entry, entries, group, teacher, blockedDay, subject, weeklyGroupHours, dailyGroupHours, weeklyTeacherHours, dailyTeacherHours });
            if (result.ok) {
              entries.push(entry);
              bump(entry);
              assigned = true;
            }
          }
        }
      }
      if (!assigned) throw new AppError(ERROR_CODES.CANNOT_SCHEDULE, 'Cannot schedule under current constraints');
    }
  }

  return entries;
}

export function shiftHolidayEntries({ entries, holiday, blockedDays, groups, teachers, subjects }) {
  const affected = entries.filter((e) => e.week_number === holiday.week_number && e.day === holiday.day);
  const unaffected = entries.filter((e) => !(e.week_number === holiday.week_number && e.day === holiday.day));
  try {
    const shifted = affected.map((e) => ({ ...e, day: Math.min(6, e.day + 1) }));
    return generateSchedule({ groups, teachers, subjects: subjects.filter((s) => affected.some((a) => a.subject_id === s.id)), blockedDays, existingEntries: [...unaffected, ...shifted] });
  } catch {
    return generateSchedule({ groups, teachers, subjects, blockedDays, existingEntries: unaffected });
  }
}

export function detectConflicts(entries, subjects, teachers) {
  return entries.map((entry) => {
    const sameSlot = entries.filter((e) => e.week_number === entry.week_number && e.day === entry.day && e.pair_start === entry.pair_start);
    const teacherConflict = sameSlot.some((e) => e.id !== entry.id && e.teacher_id === entry.teacher_id);
    const groupConflict = sameSlot.some((e) => e.id !== entry.id && e.group_id === entry.group_id);
    const subject = subjects.find((s) => s.id === entry.subject_id);
    const teacher = teachers.find((t) => t.id === entry.teacher_id);
    const departmentMismatch = subject && teacher && subject.department !== teacher.department;
    return {
      ...entry,
      color: teacherConflict || groupConflict ? 'red' : departmentMismatch ? 'yellow' : 'green'
    };
  });
}
