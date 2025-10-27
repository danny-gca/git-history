import { parse, differenceInMinutes, getDay, isBefore } from 'date-fns';
import { Config, WorkingHours } from './types.js';

/**
 * Parse a time string with a date string into a Date object
 */
export function parseTime(dateStr: string, timeStr: string): Date {
  return parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
}

/**
 * Get the working hours for a specific date and day of week
 */
export function getWorkingHours(date: Date, dayOfWeek: number, config: Config): WorkingHours | null {
  // Check if it's before the date threshold
  if (isBefore(date, config.dateBefore)) {
    return config.beforeDateWorkingHours;
  }

  // Check if it's a home day
  if (config.currentHomeDays.includes(dayOfWeek)) {
    return config.currentHomeHours;
  }

  // Check if it's an office day
  if (config.currentOfficeDays.includes(dayOfWeek)) {
    return config.currentOfficeHours;
  }

  // No working hours for this day (weekend)
  return null;
}

/**
 * Calculate night overtime (between nightStart and nightEnd, spanning midnight)
 */
export function calculateNightOvertime(
  commitTime: string,
  commitDate: Date,
  nightStart: string,
  nightEnd: string
): number {
  const dateStr = commitDate.toISOString().split('T')[0];

  // After night start (e.g., 22:00)
  if (commitTime > nightStart) {
    const commitDateTime = parseTime(dateStr, commitTime);
    const nightStartTime = parseTime(dateStr, nightStart);
    return differenceInMinutes(commitDateTime, nightStartTime);
  }

  // Before night end (e.g., 04:00) - spans midnight
  if (commitTime < nightEnd) {
    const commitDateTime = parseTime(dateStr, commitTime);
    const nightStartTime = parseTime(dateStr, nightStart);
    const beforeMidnight = parseTime(dateStr, '23:59');
    const midnight = parseTime(dateStr, '00:00');

    // Calculate from night start to midnight
    const diffNight = differenceInMinutes(beforeMidnight, nightStartTime);
    // Calculate from midnight to commit time
    const diffCommit = differenceInMinutes(commitDateTime, midnight);

    return diffNight + diffCommit;
  }

  return 0;
}

/**
 * Check if a time is during night hours
 */
export function isNightTime(commitTime: string, nightStart: string, nightEnd: string): boolean {
  return commitTime > nightStart || commitTime < nightEnd;
}

/**
 * Check if a time is before morning start
 */
export function isBeforeMorning(commitTime: string, morningStart: string, nightEnd: string): boolean {
  return commitTime < morningStart && commitTime >= nightEnd;
}

/**
 * Check if a time is during lunch break
 */
export function isDuringLunchBreak(
  commitTime: string,
  morningEnd: string,
  afternoonStart: string
): boolean {
  return commitTime > morningEnd && commitTime < afternoonStart;
}

/**
 * Check if a time is after work hours
 */
export function isAfterWork(commitTime: string, afternoonEnd: string, nightStart: string): boolean {
  return commitTime > afternoonEnd && commitTime <= nightStart;
}

/**
 * Calculate which part of lunch break the commit is closer to
 * Returns 'morning' if closer to morning end, 'afternoon' if closer to afternoon start
 */
export function getCloserLunchBoundary(
  commitTime: string,
  commitDate: string,
  morningEnd: string,
  afternoonStart: string
): 'morning' | 'afternoon' {
  const commitDateTime = parseTime(commitDate, commitTime);
  const morningEndTime = parseTime(commitDate, morningEnd);
  const afternoonStartTime = parseTime(commitDate, afternoonStart);

  const diffMorning = differenceInMinutes(commitDateTime, morningEndTime);
  const diffAfternoon = differenceInMinutes(afternoonStartTime, commitDateTime);

  return diffMorning < diffAfternoon ? 'morning' : 'afternoon';
}

/**
 * Calculate overtime minutes for a commit before morning
 */
export function calculateBeforeMorningOvertime(
  commitTime: string,
  commitDate: string,
  morningStart: string
): number {
  const commitDateTime = parseTime(commitDate, commitTime);
  const morningStartTime = parseTime(commitDate, morningStart);
  return differenceInMinutes(morningStartTime, commitDateTime);
}

/**
 * Calculate overtime minutes during lunch break
 */
export function calculateLunchBreakOvertime(
  commitTime: string,
  commitDate: string,
  morningEnd: string,
  afternoonStart: string
): number {
  const boundary = getCloserLunchBoundary(commitTime, commitDate, morningEnd, afternoonStart);
  const commitDateTime = parseTime(commitDate, commitTime);

  if (boundary === 'morning') {
    const morningEndTime = parseTime(commitDate, morningEnd);
    return differenceInMinutes(commitDateTime, morningEndTime);
  } else {
    const afternoonStartTime = parseTime(commitDate, afternoonStart);
    return differenceInMinutes(afternoonStartTime, commitDateTime);
  }
}

/**
 * Calculate overtime minutes after work
 */
export function calculateAfterWorkOvertime(
  commitTime: string,
  commitDate: string,
  afternoonEnd: string
): number {
  const commitDateTime = parseTime(commitDate, commitTime);
  const afternoonEndTime = parseTime(commitDate, afternoonEnd);
  return differenceInMinutes(commitDateTime, afternoonEndTime);
}
