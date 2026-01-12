import type { Submission } from './types';

type TimeSlot = {
  time: string;
  capacity: number;
};

type ScheduleDay = {
  date: string; // YYYY-MM-DD format for easier date management
  sessionTypes: Submission['sessionType'][];
  times: TimeSlot[];
};

export const availableSlots: ScheduleDay[] = [
  // Sunday, August 9, 2026
  {
    date: '2026-08-09T12:00:00.000Z',
    sessionTypes: ['info-session'],
    times: [
      { time: '01:00 PM - 01:45 PM', capacity: 10 },
      { time: '02:30 PM - 03:15 PM', capacity: 10 },
      { time: '04:00 PM - 04:45 PM', capacity: 10 },
    ],
  },
  // Monday, August 10, 2026
  {
    date: '2026-08-10T12:00:00.000Z',
    sessionTypes: ['workshop', 'reception'],
    times: [
      { time: '11:30 AM - 12:30 PM', capacity: 10 }, // Workshops Block 1
      { time: '03:00 PM - 04:00 PM', capacity: 10 }, // Workshops Block 2
      { time: '05:00 PM - 06:30 PM', capacity: 6 },  // Private Receptions
    ],
  },
  // Tuesday, August 11, 2026
  {
    date: '2026-08-11T12:00:00.000Z',
    sessionTypes: ['workshop', 'reception'],
    times: [
      { time: '11:30 AM - 12:30 PM', capacity: 10 }, // Workshops Block 3
      { time: '03:30 PM - 04:30 PM', capacity: 10 }, // Workshops Block 4
      { time: '05:00 PM - 06:30 PM', capacity: 6 },  // Private Receptions
    ],
  },
  // Wednesday, August 12, 2026
  {
    date: '2026-08-12T12:00:00.000Z',
    sessionTypes: ['workshop'],
    times: [
      { time: '10:30 AM - 11:30 AM', capacity: 10 }, // Workshops Block 5
    ],
  },
];

// We need to adjust the times for receptions and workshops on Monday and Tuesday
// Receptions
const mondayReception = availableSlots.find(s => s.date.startsWith('2026-08-10'));
if (mondayReception) {
    const workshopTimes = mondayReception.times.filter(t => t.time !== '05:00 PM - 06:30 PM');
    const receptionTime = mondayReception.times.find(t => t.time === '05:00 PM - 06:30 PM');
    
    const mondayWorkshops: ScheduleDay = {
        date: '2026-08-10T12:00:00.000Z',
        sessionTypes: ['workshop'],
        times: workshopTimes,
    };
    const mondayReceptions: ScheduleDay = {
        date: '2026-08-10T12:00:00.000Z',
        sessionTypes: ['reception'],
        times: receptionTime ? [receptionTime] : [],
    };
    availableSlots.splice(availableSlots.indexOf(mondayReception), 1, mondayWorkshops, mondayReceptions);
}

const tuesdayReception = availableSlots.find(s => s.date.startsWith('2026-08-11'));
if (tuesdayReception) {
    const workshopTimes = tuesdayReception.times.filter(t => t.time !== '05:00 PM - 06:30 PM');
    const receptionTime = tuesdayReception.times.find(t => t.time === '05:00 PM - 06:30 PM');
    
    const tuesdayWorkshops: ScheduleDay = {
        date: '2026-08-11T12:00:00.000Z',
        sessionTypes: ['workshop'],
        times: workshopTimes,
    };
    const tuesdayReceptions: ScheduleDay = {
        date: '2026-08-11T12:00:00.000Z',
        sessionTypes: ['reception'],
        times: receptionTime ? [receptionTime] : [],
    };
    availableSlots.splice(availableSlots.indexOf(tuesdayReception), 1, tuesdayWorkshops, tuesdayReceptions);
}
