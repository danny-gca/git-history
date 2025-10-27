import { describe, it, expect } from 'vitest';
import { calculateOvertime } from '../src/overtime-calc.js';
import { Config, GitCommit } from '../src/types.js';
import { parse } from 'date-fns';

const mockConfig: Config = {
  dateBefore: new Date('2024-02-01'),
  nightTimeStart: '22:00',
  nightTimeEnd: '04:00',
  beforeDateWorkingHours: {
    morningStart: '09:00',
    morningEnd: '12:00',
    afternoonStart: '14:00',
    afternoonEnd: '18:00',
  },
  currentHomeDays: [4, 5], // Thursday, Friday
  currentHomeHours: {
    morningStart: '08:30',
    morningEnd: '12:00',
    afternoonStart: '14:00',
    afternoonEnd: '17:30',
  },
  currentOfficeDays: [1, 2, 3], // Monday, Tuesday, Wednesday
  currentOfficeHours: {
    morningStart: '08:30',
    morningEnd: '12:30',
    afternoonStart: '13:30',
    afternoonEnd: '16:30',
  },
};

function createCommit(dateStr: string, time: string): GitCommit {
  const date = parse(`${dateStr} ${time}`, 'yyyy-MM-dd HH:mm', new Date());
  return {
    id: 'abc123',
    title: 'Test commit',
    date,
    time,
    projectName: 'test-project',
    branch: 'main',
    modifiedFiles: 1,
    addedLines: 10,
    deletedLines: 5,
  };
}

describe('calculateOvertime', () => {
  describe('Weekend detection', () => {
    it('should detect Saturday as overtime', () => {
      const commit = createCommit('2025-05-10', '10:00'); // Saturday
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isSaturday).toBe(true);
      expect(result.isOvertime).toBe(true);
      expect(result.isSunday).toBe(false);
    });

    it('should detect Sunday as overtime', () => {
      const commit = createCommit('2025-05-11', '10:00'); // Sunday
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isSunday).toBe(true);
      expect(result.isOvertime).toBe(true);
      expect(result.isSaturday).toBe(false);
    });
  });

  describe('Night time detection (22:00-04:00)', () => {
    it('should detect night overtime after 22:00', () => {
      const commit = createCommit('2025-05-05', '23:30'); // Monday
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isOvertime).toBe(true);
      expect(result.overtimeInMin).toBe(90); // 22:00 to 23:30 = 90 minutes
    });

    it('should detect night overtime before 04:00', () => {
      const commit = createCommit('2025-05-05', '02:30'); // Monday
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isOvertime).toBe(true);
      // From 22:00 to midnight (119 min) + midnight to 02:30 (150 min) = 269 min
      expect(result.overtimeInMin).toBe(269);
    });
  });

  describe('Before morning start', () => {
    it('should calculate overtime before office hours (Monday)', () => {
      const commit = createCommit('2025-05-05', '07:30'); // Monday at office
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isOvertime).toBe(true);
      expect(result.overtimeInMin).toBe(60); // 07:30 to 08:30 = 60 minutes
    });

    it('should calculate overtime before home hours (Thursday)', () => {
      const commit = createCommit('2025-05-08', '07:00'); // Thursday at home
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isOvertime).toBe(true);
      expect(result.overtimeInMin).toBe(90); // 07:00 to 08:30 = 90 minutes
    });

    it('should calculate overtime before old working hours', () => {
      const commit = createCommit('2024-01-15', '08:00'); // Before DATE_BEFORE
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isOvertime).toBe(true);
      expect(result.overtimeInMin).toBe(60); // 08:00 to 09:00 = 60 minutes
    });
  });

  describe('Lunch break', () => {
    it('should calculate overtime during lunch break (closer to morning end)', () => {
      const commit = createCommit('2025-05-05', '12:35'); // Monday at office
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isOvertime).toBe(true);
      expect(result.overtimeInMin).toBe(5); // 12:30 to 12:35 = 5 minutes (closer to 12:30)
    });

    it('should calculate overtime during lunch break (closer to afternoon start)', () => {
      const commit = createCommit('2025-05-05', '13:15'); // Monday at office
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isOvertime).toBe(true);
      expect(result.overtimeInMin).toBe(15); // 13:15 to 13:30 = 15 minutes
    });
  });

  describe('After work hours', () => {
    it('should calculate overtime after office hours (Monday)', () => {
      const commit = createCommit('2025-05-05', '18:00'); // Monday at office
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isOvertime).toBe(true);
      expect(result.overtimeInMin).toBe(90); // 16:30 to 18:00 = 90 minutes
    });

    it('should calculate overtime after home hours (Thursday)', () => {
      const commit = createCommit('2025-05-08', '19:30'); // Thursday at home
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isOvertime).toBe(true);
      expect(result.overtimeInMin).toBe(120); // 17:30 to 19:30 = 120 minutes
    });

    it('should calculate overtime after old working hours', () => {
      const commit = createCommit('2024-01-15', '19:00'); // Before DATE_BEFORE
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isOvertime).toBe(true);
      expect(result.overtimeInMin).toBe(60); // 18:00 to 19:00 = 60 minutes
    });
  });

  describe('During normal working hours', () => {
    it('should NOT detect overtime during office morning hours', () => {
      const commit = createCommit('2025-05-05', '10:00'); // Monday at office
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isOvertime).toBe(false);
      expect(result.overtimeInMin).toBe(0);
    });

    it('should NOT detect overtime during office afternoon hours', () => {
      const commit = createCommit('2025-05-05', '15:00'); // Monday at office
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isOvertime).toBe(false);
      expect(result.overtimeInMin).toBe(0);
    });

    it('should NOT detect overtime during home working hours', () => {
      const commit = createCommit('2025-05-08', '10:00'); // Thursday at home
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isOvertime).toBe(false);
      expect(result.overtimeInMin).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle exact morning start time', () => {
      const commit = createCommit('2025-05-05', '08:30'); // Exact start
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isOvertime).toBe(false);
      expect(result.overtimeInMin).toBe(0);
    });

    it('should handle exact afternoon end time', () => {
      const commit = createCommit('2025-05-05', '16:30'); // Exact end
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isOvertime).toBe(false);
      expect(result.overtimeInMin).toBe(0);
    });

    it('should handle midnight commits', () => {
      const commit = createCommit('2025-05-05', '00:00'); // Midnight
      const result = calculateOvertime(commit, mockConfig);

      expect(result.isOvertime).toBe(true);
      // From 22:00 to midnight = 119 minutes
      expect(result.overtimeInMin).toBe(119);
    });
  });
});
