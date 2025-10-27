import dotenv from 'dotenv';
import { Config } from './types.js';

dotenv.config();

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

function parseNumberArray(value: string): number[] {
  return value.split(',').map(n => parseInt(n.trim(), 10));
}

export function loadConfig(): Config {
  return {
    dateBefore: new Date(getEnv('DATE_BEFORE')),
    nightTimeStart: getEnv('NIGHT_TIME_START'),
    nightTimeEnd: getEnv('NIGHT_TIME_END'),
    beforeDateWorkingHours: {
      morningStart: getEnv('BEFORE_DATE_MORNING_START'),
      morningEnd: getEnv('BEFORE_DATE_MORNING_END'),
      afternoonStart: getEnv('BEFORE_DATE_AFTERNOON_START'),
      afternoonEnd: getEnv('BEFORE_DATE_AFTERNOON_END'),
    },
    currentHomeDays: parseNumberArray(getEnv('CURRENT_HOME_DAYS')),
    currentHomeHours: {
      morningStart: getEnv('CURRENT_HOME_MORNING_START'),
      morningEnd: getEnv('CURRENT_HOME_MORNING_END'),
      afternoonStart: getEnv('CURRENT_HOME_AFTERNOON_START'),
      afternoonEnd: getEnv('CURRENT_HOME_AFTERNOON_END'),
    },
    currentOfficeDays: parseNumberArray(getEnv('CURRENT_OFFICE_DAYS')),
    currentOfficeHours: {
      morningStart: getEnv('CURRENT_OFFICE_MORNING_START'),
      morningEnd: getEnv('CURRENT_OFFICE_MORNING_END'),
      afternoonStart: getEnv('CURRENT_OFFICE_AFTERNOON_START'),
      afternoonEnd: getEnv('CURRENT_OFFICE_AFTERNOON_END'),
    },
  };
}
