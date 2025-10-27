import { stringify } from 'csv-stringify/sync';
import { writeFileSync } from 'fs';
import { format } from 'date-fns';
import { CommitWithOvertime, Config, DayOvertime } from './types.js';

export function writeCommitsToCSV(
  commits: CommitWithOvertime[],
  outputPath: string,
  userEmail: string,
  repoPath: string,
  config: Config
): void {
  const lines: string[] = [];

  // Header information
  lines.push('user;repository');
  lines.push(`${userEmail};${repoPath}`);
  lines.push('');

  // Working hours configuration
  lines.push(
    `Before ${format(config.dateBefore, 'yyyy-MM-dd')} working hours;morning_start;morning_end;afternoon_start;afternoon_end`
  );
  lines.push(
    `;${config.beforeDateWorkingHours.morningStart};${config.beforeDateWorkingHours.morningEnd};${config.beforeDateWorkingHours.afternoonStart};${config.beforeDateWorkingHours.afternoonEnd}`
  );
  lines.push('');

  lines.push(
    'Current working hours at office;morning_start;morning_end;afternoon_start;afternoon_end'
  );
  lines.push(
    `${config.currentOfficeDays.join(' ')};${config.currentOfficeHours.morningStart};${config.currentOfficeHours.morningEnd};${config.currentOfficeHours.afternoonStart};${config.currentOfficeHours.afternoonEnd}`
  );
  lines.push('');

  lines.push(
    'Current working hours at home;morning_start;morning_end;afternoon_start;afternoon_end'
  );
  lines.push(
    `${config.currentHomeDays.join(' ')};${config.currentHomeHours.morningStart};${config.currentHomeHours.morningEnd};${config.currentHomeHours.afternoonStart};${config.currentHomeHours.afternoonEnd}`
  );
  lines.push('');

  // Commits data
  const commitData = commits.map(commit => [
    commit.projectName,
    commit.id,
    commit.branch,
    commit.title,
    commit.modifiedFiles,
    commit.addedLines,
    commit.deletedLines,
    format(commit.date, 'yyyy-MM-dd'),
    commit.time,
    commit.isOvertime ? 1 : 0,
    commit.isSaturday ? 1 : 0,
    commit.isSunday ? 1 : 0,
    commit.overtimeInMin,
  ]);

  const csvContent = stringify(commitData, {
    delimiter: ';',
    header: true,
    columns: [
      'project_name',
      'commit_id',
      'branch',
      'commit_title',
      'modified_files',
      'added_lines',
      'deleted_lines',
      'date',
      'time',
      'is_overtime',
      'is_saturday',
      'is_sunday',
      'overtime_in_min',
    ],
  });

  const output = lines.join('\n') + '\n' + csvContent;
  writeFileSync(outputPath, output, 'utf-8');
}

export function writeDayOvertimeToCSV(dayOvertimes: DayOvertime[], outputPath: string): void {
  const data = dayOvertimes
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(day => [
      day.date,
      day.beforeMorning,
      day.afterMorning,
      day.beforeAfternoon,
      day.afterwork,
      day.night,
      day.saturday,
      day.sunday,
      day.total,
    ]);

  const csvContent = stringify(data, {
    delimiter: ';',
    header: true,
    columns: [
      'date',
      'before_morning',
      'after_morning',
      'before_afternoon',
      'afterwork',
      'night',
      'saturday',
      'sunday',
      'total',
    ],
  });

  writeFileSync(outputPath, csvContent, 'utf-8');
}
