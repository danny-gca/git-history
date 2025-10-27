import { readFileSync } from 'fs';
import { format, parse, differenceInMinutes, getDay } from 'date-fns';
import { loadConfig } from './config.js';
import { DayOvertime } from './types.js';
import { writeDayOvertimeToCSV } from './csv-writer.js';
import { getWorkingHours, parseTime, isNightTime } from './helpers.js';

interface DayOvertimeTracker {
  // For before_morning, after_morning, before_afternoon, afterwork
  minBeforeMorning?: Date;
  minAfterMorning?: Date;
  maxBeforeAfternoon?: Date;
  maxAfterwork?: Date;

  // For night, saturday, sunday
  minNight?: Date;
  maxNight?: Date;
  minSaturday?: Date;
  maxSaturday?: Date;
  minSunday?: Date;
  maxSunday?: Date;
}

export async function generateOvertimeByDay(csvPath: string, outputPath: string): Promise<string> {
  const config = loadConfig();

  // Read CSV file
  const csvContent = readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');

  const trackers = new Map<string, DayOvertimeTracker>();
  let insideDataSection = false;

  for (const line of lines) {
    // Skip until we reach the data section
    if (
      line.startsWith(
        'project_name;commit_id;branch;commit_title;modified_files;added_lines;deleted_lines;date;time;is_overtime;is_saturday;is_sunday;overtime_in_min'
      )
    ) {
      insideDataSection = true;
      continue;
    }

    if (!insideDataSection || !line.trim()) continue;

    const parts = line.split(';');
    if (parts.length < 13) continue;

    const commitDate = parts[7];
    const commitTime = parts[8];
    const isSaturday = parts[10] === '1';
    const isSunday = parts[11] === '1';

    const dateTime = parseTime(commitDate, commitTime);
    const dayOfWeek = getDay(dateTime);

    // Initialize tracker for this date
    if (!trackers.has(commitDate)) {
      trackers.set(commitDate, {});
    }

    const tracker = trackers.get(commitDate)!;

    // Handle Saturday
    if (isSaturday) {
      if (!tracker.minSaturday) {
        tracker.minSaturday = dateTime;
      } else {
        if (dateTime < tracker.minSaturday) {
          tracker.maxSaturday = tracker.minSaturday;
          tracker.minSaturday = dateTime;
        } else if (!tracker.maxSaturday || dateTime > tracker.maxSaturday) {
          tracker.maxSaturday = dateTime;
        }
      }
      continue;
    }

    // Handle Sunday
    if (isSunday) {
      if (!tracker.minSunday) {
        tracker.minSunday = dateTime;
      } else {
        if (dateTime < tracker.minSunday) {
          tracker.maxSunday = tracker.minSunday;
          tracker.minSunday = dateTime;
        } else if (!tracker.maxSunday || dateTime > tracker.maxSunday) {
          tracker.maxSunday = dateTime;
        }
      }
      continue;
    }

    const workingHours = getWorkingHours(dateTime, dayOfWeek, config);
    if (!workingHours) continue;

    // Check if night time
    if (isNightTime(commitTime, config.nightTimeStart, config.nightTimeEnd)) {
      if (!tracker.minNight) {
        tracker.minNight = dateTime;
      } else {
        if (dateTime < tracker.minNight) {
          tracker.maxNight = tracker.minNight;
          tracker.minNight = dateTime;
        } else if (!tracker.maxNight || dateTime > tracker.maxNight) {
          tracker.maxNight = dateTime;
        }
      }
    }
    // Before morning
    else if (commitTime < workingHours.morningStart) {
      if (!tracker.minBeforeMorning || dateTime < tracker.minBeforeMorning) {
        tracker.minBeforeMorning = dateTime;
      }
    }
    // During lunch break
    else if (commitTime > workingHours.morningEnd && commitTime < workingHours.afternoonStart) {
      const morningEndTime = parseTime(commitDate, workingHours.morningEnd);
      const afternoonStartTime = parseTime(commitDate, workingHours.afternoonStart);

      const diffMorning = differenceInMinutes(dateTime, morningEndTime);
      const diffAfternoon = differenceInMinutes(afternoonStartTime, dateTime);

      // Closer to morning end
      if (diffMorning < diffAfternoon) {
        if (!tracker.minAfterMorning || dateTime > tracker.minAfterMorning) {
          tracker.minAfterMorning = dateTime;
        }
      }
      // Closer to afternoon start
      else {
        if (!tracker.maxBeforeAfternoon || dateTime < tracker.maxBeforeAfternoon) {
          tracker.maxBeforeAfternoon = dateTime;
        }
      }
    }
    // After work
    else if (commitTime > workingHours.afternoonEnd) {
      if (!tracker.maxAfterwork || dateTime > tracker.maxAfterwork) {
        tracker.maxAfterwork = dateTime;
      }
    }
  }

  // Calculate final overtime for each day
  const dayOvertimes: DayOvertime[] = [];

  for (const [dateStr, tracker] of trackers) {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    const dayOfWeek = getDay(date);
    const workingHours = getWorkingHours(date, dayOfWeek, config);

    let beforeMorning = 0;
    let afterMorning = 0;
    let beforeAfternoon = 0;
    let afterwork = 0;
    let night = 0;
    let saturday = 0;
    let sunday = 0;

    // Calculate before morning
    if (tracker.minBeforeMorning && workingHours) {
      const morningStart = parseTime(dateStr, workingHours.morningStart);
      beforeMorning = differenceInMinutes(morningStart, tracker.minBeforeMorning);
    }

    // Calculate after morning
    if (tracker.minAfterMorning && workingHours) {
      const morningEnd = parseTime(dateStr, workingHours.morningEnd);
      afterMorning = differenceInMinutes(tracker.minAfterMorning, morningEnd);
    }

    // Calculate before afternoon
    if (tracker.maxBeforeAfternoon && workingHours) {
      const afternoonStart = parseTime(dateStr, workingHours.afternoonStart);
      beforeAfternoon = differenceInMinutes(afternoonStart, tracker.maxBeforeAfternoon);
    }

    // Calculate afterwork
    if (tracker.maxAfterwork && workingHours) {
      const afternoonEnd = parseTime(dateStr, workingHours.afternoonEnd);
      afterwork = differenceInMinutes(tracker.maxAfterwork, afternoonEnd);
    }

    // Calculate night
    if (tracker.minNight && tracker.maxNight) {
      night = differenceInMinutes(tracker.maxNight, tracker.minNight);
    }

    // Calculate saturday
    if (tracker.minSaturday && tracker.maxSaturday) {
      saturday = differenceInMinutes(tracker.maxSaturday, tracker.minSaturday);
    }

    // Calculate sunday
    if (tracker.minSunday && tracker.maxSunday) {
      sunday = differenceInMinutes(tracker.maxSunday, tracker.minSunday);
    }

    const total = beforeMorning + afterMorning + beforeAfternoon + afterwork + night + saturday + sunday;

    // Only add days with at least some overtime
    if (total > 0) {
      dayOvertimes.push({
        date: dateStr,
        beforeMorning,
        afterMorning,
        beforeAfternoon,
        afterwork,
        night,
        saturday,
        sunday,
        total,
      });
    }
  }

  const currentDate = format(new Date(), 'yyyy-MM-dd-HH-mm');
  const finalOutputPath = `${outputPath}/overtime-by-day.${currentDate}.csv`;
  writeDayOvertimeToCSV(dayOvertimes, finalOutputPath);

  return finalOutputPath;
}
