import type { Submission } from './types';

type TimeSlot = {
  time: string;
  capacity: number;
};

type ScheduleDay = {
  date: string; // ISO string — use T12:00:00.000Z to avoid timezone shifts
  sessionTypes: Submission['sessionType'][];
  times: TimeSlot[];
};

export const availableSlots: ScheduleDay[] = [
  // ─── Sunday, August 9, 2026 — Info Sessions only ─────────────────────────────
  {
    date: '2026-08-09T12:00:00.000Z',
    sessionTypes: ['info-session'],
    times: [
      { time: '01:00 PM - 02:00 PM', capacity: 10 },
      { time: '02:30 PM - 03:30 PM', capacity: 10 },
      { time: '04:00 PM - 05:00 PM', capacity: 10 },
    ],
  },

  // ─── Monday, August 10, 2026 ─────────────────────────────────────────────────
  {
    date: '2026-08-10T12:00:00.000Z',
    sessionTypes: ['workshop'],
    times: [
      { time: '11:30 AM - 12:30 PM', capacity: 10 },
      { time: '02:00 PM - 03:00 PM', capacity: 10 },
      { time: '03:30 PM - 04:30 PM', capacity: 10 },
    ],
  },
  {
    date: '2026-08-10T12:00:00.000Z',
    sessionTypes: ['reception'],
    times: [
      { time: '05:00 PM - 06:30 PM', capacity: 6 },
    ],
  },

  // ─── Tuesday, August 11, 2026 ────────────────────────────────────────────────
  {
    date: '2026-08-11T12:00:00.000Z',
    sessionTypes: ['workshop'],
    times: [
      { time: '11:00 AM - 12:00 PM', capacity: 10 },
      { time: '03:00 PM - 04:00 PM', capacity: 10 },
    ],
  },
  {
    date: '2026-08-11T12:00:00.000Z',
    sessionTypes: ['reception'],
    times: [
      { time: '07:30 AM - 09:00 AM', capacity: 6 },
      { time: '05:00 PM - 06:30 PM', capacity: 6 },
    ],
  },

  // ─── Wednesday, August 12, 2026 ──────────────────────────────────────────────
  {
    date: '2026-08-12T12:00:00.000Z',
    sessionTypes: ['workshop'],
    times: [
      { time: '12:00 PM - 01:00 PM', capacity: 10 },
    ],
  },
  {
    date: '2026-08-12T12:00:00.000Z',
    sessionTypes: ['reception'],
    times: [
      { time: '07:30 AM - 09:00 AM', capacity: 6 },
      { time: '05:00 PM - 06:30 PM', capacity: 6 },
    ],
  },
];
