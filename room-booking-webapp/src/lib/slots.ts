// The half-hour start/end choices offered by the search and booking forms
// (the prototype's SLOTS), office local time.
import { isPast, type OfficeDate, type OfficeTime } from "./officeTime";

export const SLOTS: readonly OfficeTime[] = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00",
  "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00",
];

/** Start times that are still in the future on `date` (a past start is never offered). */
export function startSlots(date: OfficeDate, now: Date = new Date()): OfficeTime[] {
  return SLOTS.filter((slot) => !isPast(date, slot, now));
}
