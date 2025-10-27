import { getDay } from 'date-fns';
import { Config, GitCommit, OvertimeInfo, CommitWithOvertime } from './types.js';
import {
  getWorkingHours,
  calculateNightOvertime,
  calculateBeforeMorningOvertime,
  calculateLunchBreakOvertime,
  calculateAfterWorkOvertime,
} from './helpers.js';

export function calculateOvertime(commit: GitCommit, config: Config): OvertimeInfo {
  const dayOfWeek = getDay(commit.date);
  let isOvertime = false;
  let isSaturday = false;
  let isSunday = false;
  let overtimeInMin = 0;

  // Check for Saturday
  if (dayOfWeek === 6) {
    isSaturday = true;
    isOvertime = true;
  }

  // Check for Sunday
  if (dayOfWeek === 0) {
    isSunday = true;
    isOvertime = true;
  }

  // If it's a weekend, no need to check working hours
  if (isSaturday || isSunday) {
    return { isOvertime, isSaturday, isSunday, overtimeInMin };
  }

  const workingHours = getWorkingHours(commit.date, dayOfWeek, config);

  if (!workingHours) {
    // No working hours defined for this day, consider it overtime
    isOvertime = true;
    return { isOvertime, isSaturday, isSunday, overtimeInMin };
  }

  const commitTime = commit.time;
  const dateStr = commit.date.toISOString().split('T')[0];
  const { morningStart, morningEnd, afternoonStart, afternoonEnd } = workingHours;

  // Check if night time (22h-4h)
  const nightOvertime = calculateNightOvertime(commitTime, commit.date, config.nightTimeStart, config.nightTimeEnd);
  if (nightOvertime > 0) {
    isOvertime = true;
    overtimeInMin = nightOvertime;
    return { isOvertime, isSaturday, isSunday, overtimeInMin };
  }

  // Before morning start
  if (commitTime < morningStart) {
    overtimeInMin = calculateBeforeMorningOvertime(commitTime, dateStr, morningStart);
    isOvertime = true;
  }
  // During lunch break
  else if (commitTime > morningEnd && commitTime < afternoonStart) {
    overtimeInMin = calculateLunchBreakOvertime(commitTime, dateStr, morningEnd, afternoonStart);
    isOvertime = true;
  }
  // After work
  else if (commitTime > afternoonEnd) {
    overtimeInMin = calculateAfterWorkOvertime(commitTime, dateStr, afternoonEnd);
    isOvertime = true;
  }

  return { isOvertime, isSaturday, isSunday, overtimeInMin };
}

export function processCommits(commits: GitCommit[], config: Config): CommitWithOvertime[] {
  return commits.map(commit => ({
    ...commit,
    ...calculateOvertime(commit, config),
  }));
}
