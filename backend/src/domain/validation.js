import { AppError, ERROR_CODES } from '../utils/errors.js';

const validMaxPairs = [0, 1, 2, 3, 4, 5];

export function validateInputs({ groups, subjects, blockedDays }) {
  if (!groups.length) throw new AppError(ERROR_CODES.CANNOT_SCHEDULE, 'At least 1 group required');
  if (!subjects.length) throw new AppError(ERROR_CODES.CANNOT_SCHEDULE, 'At least 1 subject required');

  if (blockedDays.length === 6 && blockedDays.every((d) => d.max_pairs === 0)) {
    throw new AppError(ERROR_CODES.CANNOT_SCHEDULE, 'All days have 0 hours');
  }

  for (const day of blockedDays) {
    if (!validMaxPairs.includes(day.max_pairs)) {
      throw new AppError(ERROR_CODES.CANNOT_SCHEDULE, 'Invalid day config');
    }
  }

  for (const subject of subjects) {
    if (!subject.teacher_id) throw new AppError(ERROR_CODES.CANNOT_SCHEDULE, 'All subjects must have teacher');
    if (subject.weekly_hours > subject.total_hours) {
      throw new AppError(ERROR_CODES.INVALID_SUBJECT_HOURS, 'weekly_hours > total_hours');
    }
    if (subject.type === 'PRACTICAL' && subject.total_hours % 6 !== 0) {
      throw new AppError(ERROR_CODES.INVALID_SUBJECT_HOURS);
    }
    if (subject.type === 'THEORY' && subject.total_hours % 2 !== 0) {
      throw new AppError(ERROR_CODES.INVALID_SUBJECT_HOURS);
    }
  }
}

export function sortSubjects(subjects) {
  return [...subjects].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.type !== b.type) return a.type === 'PRACTICAL' ? -1 : 1;
    return b.total_hours - a.total_hours;
  });
}
