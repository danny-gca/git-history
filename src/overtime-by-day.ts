#!/usr/bin/env node
import { readFileSync } from 'fs';
import { format, parse, differenceInMinutes, getDay } from 'date-fns';
import { loadConfig } from './config.js';
import { DayOvertime, WorkingHours } from './types.js';
import { writeDayOvertimeToCSV } from './csv-writer.js';

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

function parseArgs(): { csvPath: string; outputPath: string } {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error('Usage:');
    console.error('npm run overtime-by-day -- <CSV_file_path> <Output_file_path>');
    process.exit(1);
  }

  return {
    csvPath: args[0],
    outputPath: args[1],
  };
}

function parseTime(dateStr: string, timeStr: string): Date {
  return parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
}

function getWorkingHours(date: Date, dayOfWeek: number, config: any): WorkingHours | null {
  if (date < config.dateBefore) {
    return config.beforeDateWorkingHours;
  }

  if (config.currentHomeDays.includes(dayOfWeek)) {
    return config.currentHomeHours;
  }

  if (config.currentOfficeDays.includes(dayOfWeek)) {
    return config.currentOfficeHours;
  }

  return null;
}

function main() {
  console.log('⚙️  Chargement de la configuration...');
  const config = loadConfig();

  const { csvPath, outputPath } = parseArgs();

  console.log(`⛏️  Calcul des heures supp depuis : ${csvPath}`);

  // Read CSV file
  const csvContent = readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');

  const trackers = new Map<string, DayOvertimeTracker>();
  let insideDataSection = false;

  for (const line of lines) {
    // Skip until we reach the data section
    if (line.startsWith('project_name;commit_id;branch;commit_title;modified_files;added_lines;deleted_lines;date;time;is_overtime;is_saturday;is_sunday;overtime_in_min')) {
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
    if (commitTime > config.nightTimeStart || commitTime < config.nightTimeEnd) {
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

  console.log('▶️  Création du fichier CSV...');
  const currentDate = format(new Date(), 'yyyy-MM-dd-HH-mm');
  const finalOutputPath = `${outputPath}/overtime-by-day.${currentDate}.csv`;
  writeDayOvertimeToCSV(dayOvertimes, finalOutputPath);

  console.log('✅  Fichier CSV généré :');
  console.log(`"${finalOutputPath}"`);
}

main();
