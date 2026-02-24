export const ERROR_CODES = {
  INVALID_SUBJECT_HOURS: 'INVALID_SUBJECT_HOURS',
  WEEKLY_LIMIT_EXCEEDED: 'WEEKLY_LIMIT_EXCEEDED',
  DAILY_LIMIT_EXCEEDED: 'DAILY_LIMIT_EXCEEDED',
  TEACHER_CONFLICT: 'TEACHER_CONFLICT',
  GROUP_CONFLICT: 'GROUP_CONFLICT',
  CANNOT_SCHEDULE: 'CANNOT_SCHEDULE'
};

export class AppError extends Error {
  constructor(code, message = code, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
