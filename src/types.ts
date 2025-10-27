export interface WorkingHours {
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
}

export interface Config {
  dateBefore: Date;
  nightTimeStart: string;
  nightTimeEnd: string;
  beforeDateWorkingHours: WorkingHours;
  currentHomeDays: number[];
  currentHomeHours: WorkingHours;
  currentOfficeDays: number[];
  currentOfficeHours: WorkingHours;
}

export interface GitCommit {
  id: string;
  title: string;
  date: Date;
  time: string;
  projectName: string;
  branch: string;
  modifiedFiles: number;
  addedLines: number;
  deletedLines: number;
}

export interface OvertimeInfo {
  isOvertime: boolean;
  isSaturday: boolean;
  isSunday: boolean;
  overtimeInMin: number;
}

export interface CommitWithOvertime extends GitCommit, OvertimeInfo {}

export interface DayOvertime {
  date: string;
  beforeMorning: number;
  afterMorning: number;
  beforeAfternoon: number;
  afterwork: number;
  night: number;
  saturday: number;
  sunday: number;
  total: number;
}
