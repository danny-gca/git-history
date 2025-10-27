import { getDay, parse, differenceInMinutes, isBefore } from 'date-fns';
import { Config, GitCommit, OvertimeInfo, CommitWithOvertime, WorkingHours } from './types.js';

function parseTime(dateStr: string, timeStr: string): Date {
  return parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
}

function getWorkingHours(commit: GitCommit, config: Config): WorkingHours | null {
  const dayOfWeek = getDay(commit.date); // 0=Sunday, 1=Monday, ..., 6=Saturday

  // Check if it's before the date threshold
  if (isBefore(commit.date, config.dateBefore)) {
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

function isTimeInRange(time: string, start: string, end: string): boolean {
  return time >= start && time <= end;
}

function calculateNightOvertime(commitTime: string, commitDate: Date, nightStart: string, nightEnd: string): number {
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

  const workingHours = getWorkingHours(commit, config);

  if (!workingHours) {
    // No working hours defined for this day, consider it overtime
    isOvertime = true;
    return { isOvertime, isSaturday, isSunday, overtimeInMin };
  }

  const commitTime = commit.time;
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
    const dateStr = commit.date.toISOString().split('T')[0];
    const commitDateTime = parseTime(dateStr, commitTime);
    const morningStartTime = parseTime(dateStr, morningStart);
    overtimeInMin = differenceInMinutes(morningStartTime, commitDateTime);
    isOvertime = true;
  }
  // During lunch break
  else if (commitTime > morningEnd && commitTime < afternoonStart) {
    const dateStr = commit.date.toISOString().split('T')[0];
    const commitDateTime = parseTime(dateStr, commitTime);
    const morningEndTime = parseTime(dateStr, morningEnd);
    const afternoonStartTime = parseTime(dateStr, afternoonStart);

    const diffMorning = differenceInMinutes(commitDateTime, morningEndTime);
    const diffAfternoon = differenceInMinutes(afternoonStartTime, commitDateTime);

    overtimeInMin = Math.min(diffMorning, diffAfternoon);
    isOvertime = true;
  }
  // After work
  else if (commitTime > afternoonEnd) {
    const dateStr = commit.date.toISOString().split('T')[0];
    const commitDateTime = parseTime(dateStr, commitTime);
    const afternoonEndTime = parseTime(dateStr, afternoonEnd);
    overtimeInMin = differenceInMinutes(commitDateTime, afternoonEndTime);
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
