// Mock handlers for room-booking-api (the service layer; the gateway's scope
// checks are mock/authz/gateway.ts). F1 holds listRooms, getRoom and
// listRoomBusyTimes; F2/F3 add the /me/bookings operations.
// State lives in the page and resets on a full page load.
//
// Seed rows are the prototype's records. Their dates are relative to the
// browser's "today" (prototype today = 2026-01-15), so the demo stays current.
import { http, HttpResponse, type RequestHandler } from "msw";
import { endsAfterStart, isPast, rangesOverlap } from "../src/lib/officeTime";

interface Room { id: string; name: string; capacity: number; location: string }
export interface SeedBooking {
  id: string;
  roomId: string;
  memberId: string;
  date: string;
  startTime: string;
  endTime: string;
  attendees: number;
}

export const rooms: Room[] = [
  { id: "atlas", name: "Atlas", capacity: 4, location: "Floor 1, east wing" },
  { id: "borealis", name: "Borealis", capacity: 6, location: "Floor 1, west wing" },
  { id: "cedar", name: "Cedar", capacity: 10, location: "Floor 2, east wing" },
  { id: "delta", name: "Delta", capacity: 2, location: "Floor 2, phone nook" },
  { id: "everest", name: "Everest", capacity: 16, location: "Floor 3, boardroom" },
];

const pad = (n: number): string => String(n).padStart(2, "0");
/** The office date `offset` days from today, built from parts (never UTC). */
function dayOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const ME = "member.asha";
export const bookings: SeedBooking[] = [
  { id: "b1", roomId: "atlas", memberId: "member.ravi", date: dayOffset(0), startTime: "11:00", endTime: "12:00", attendees: 3 },
  { id: "b2", roomId: "borealis", memberId: ME, date: dayOffset(0), startTime: "13:00", endTime: "14:00", attendees: 5 },
  { id: "b3", roomId: "cedar", memberId: "member.ana", date: dayOffset(1), startTime: "09:00", endTime: "10:30", attendees: 8 },
  { id: "b4", roomId: "everest", memberId: "member.ravi", date: dayOffset(1), startTime: "14:00", endTime: "15:00", attendees: 12 },
  { id: "b5", roomId: "atlas", memberId: ME, date: dayOffset(-1), startTime: "15:00", endTime: "16:00", attendees: 3 },
];

const error = (status: number, message: string, description?: string) =>
  HttpResponse.json({ code: status, message, ...(description ? { description } : {}) }, { status });

const HHMM = /^\d{2}:\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function page<T>(url: URL, items: T[]) {
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20) || 20, 1), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);
  return {
    count: items.length,
    next: offset + limit < items.length ? `${url.pathname}?limit=${limit}&offset=${offset + limit}` : null,
    previous: offset > 0 ? `${url.pathname}?limit=${limit}&offset=${Math.max(offset - limit, 0)}` : null,
    data: items.slice(offset, offset + limit),
  };
}

export const handlers: RequestHandler[] = [
  // listRooms
  http.get("/api/rooms", ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams;
    const date = q.get("date");
    const start = q.get("startTime");
    const end = q.get("endTime");
    const minRaw = q.get("minCapacity");
    const min = minRaw === null ? null : Number(minRaw);

    if (min !== null && (!Number.isInteger(min) || min < 1)) return error(400, "Bad request", "minCapacity must be at least 1.");
    const range = [date, start, end];
    if (range.some((v) => v !== null) && range.some((v) => v === null)) {
      return error(400, "Bad request", "date, startTime and endTime must be given together.");
    }
    if (date && start && end) {
      if (!DATE.test(date) || !HHMM.test(start) || !HHMM.test(end)) return error(400, "Bad request", "Invalid date or time.");
      if (!endsAfterStart(start, end)) return error(400, "Bad request", "The end time must be after the start time.");
      if (isPast(date, start)) return error(400, "Bad request", "The start time has already passed.");
    }

    let found = [...rooms].sort((a, b) => a.name.localeCompare(b.name));
    if (min !== null) found = found.filter((r) => r.capacity >= min);
    if (date && start && end) {
      found = found.filter(
        (r) => !bookings.some((b) => b.roomId === r.id && b.date === date && rangesOverlap(start, end, b.startTime, b.endTime)),
      );
    }
    return HttpResponse.json(page(url, found));
  }),

  // listRoomBusyTimes (before the bare room route)
  http.get("/api/rooms/:roomId/busy-times", ({ params, request }) => {
    const url = new URL(request.url);
    const room = rooms.find((r) => r.id === params.roomId);
    if (!room) return error(404, "Not found", "No such room.");
    const date = url.searchParams.get("date");
    if (!date || !DATE.test(date)) return error(400, "Bad request", "date is required (YYYY-MM-DD).");
    const busy = bookings
      .filter((b) => b.roomId === room.id && b.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((b) => ({ date: b.date, startTime: b.startTime, endTime: b.endTime })); // never who booked it
    return HttpResponse.json(page(url, busy));
  }),

  // createMyBooking: same rules as the API (400 invalid / past, 404 room, 409 clash or limit)
  http.post("/api/me/bookings", async ({ request }) => {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const { roomId, date, startTime, endTime, attendees } = (body ?? {}) as {
      roomId?: string; date?: string; startTime?: string; endTime?: string; attendees?: number;
    };
    if (
      typeof roomId !== "string" || typeof date !== "string" || typeof startTime !== "string" ||
      typeof endTime !== "string" || typeof attendees !== "number"
    ) return error(400, "Bad request", "roomId, date, startTime, endTime and attendees are required.");
    if (!DATE.test(date) || !HHMM.test(startTime) || !HHMM.test(endTime)) return error(400, "Bad request", "Invalid date or time.");
    if (!Number.isInteger(attendees) || attendees < 1) return error(400, "Bad request", "Attendees must be a whole number of at least 1.");
    if (!endsAfterStart(startTime, endTime)) return error(400, "Bad request", "The end time must be after the start time.");
    if (isPast(date, startTime)) return error(400, "Bad request", "The start time has already passed. Pick a future start.");
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return error(404, "Not found", "No such room.");
    if (attendees > room.capacity) {
      return error(400, "Bad request", `${room.name} holds ${room.capacity} people; ${attendees} attendees are too many.`);
    }
    const clash = bookings.find(
      (b) => b.roomId === room.id && b.date === date && rangesOverlap(startTime, endTime, b.startTime, b.endTime),
    );
    if (clash) {
      return error(409, "Conflict", `${room.name} is already booked from ${clash.startTime} to ${clash.endTime} on ${date}.`);
    }
    const upcoming = bookings.filter((b) => b.memberId === ME && isPast(b.date, b.startTime) === false).length;
    if (upcoming >= 2) return error(409, "Conflict", "You already hold two upcoming bookings. Cancel one to book another.");
    const created: SeedBooking = {
      id: `b${bookings.length + 1}-${Date.now()}`,
      roomId: room.id, memberId: ME, date, startTime, endTime, attendees,
    };
    bookings.push(created);
    return HttpResponse.json(
      { id: created.id, roomId: room.id, roomName: room.name, date, startTime, endTime, attendees, status: "upcoming" },
      { status: 201 },
    );
  }),

  // listMyBookings: the caller's own rows, upcoming (soonest first) then started (latest first)
  http.get("/api/me/bookings", ({ request }) => {
    const url = new URL(request.url);
    const key = (b: SeedBooking): string => `${b.date} ${b.startTime}`;
    const mine = bookings.filter((b) => b.memberId === ME);
    const upcoming = mine.filter((b) => !isPast(b.date, b.startTime)).sort((a, b) => key(a).localeCompare(key(b)));
    const started = mine.filter((b) => isPast(b.date, b.startTime)).sort((a, b) => key(b).localeCompare(key(a)));
    const view = [...upcoming, ...started].map((b) => ({
      id: b.id,
      roomId: b.roomId,
      roomName: rooms.find((r) => r.id === b.roomId)?.name ?? b.roomId,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      attendees: b.attendees,
      status: isPast(b.date, b.startTime) ? "past" : "upcoming",
    }));
    return HttpResponse.json(page(url, view));
  }),

  // cancelMyBooking: another member's (or unknown) booking is 404, a started one is 409
  http.delete("/api/me/bookings/:bookingId", ({ params }) => {
    const index = bookings.findIndex((b) => b.id === params.bookingId && b.memberId === ME);
    if (index < 0) return error(404, "Not found", "No such booking of yours.");
    const b = bookings[index];
    if (isPast(b.date, b.startTime)) {
      return error(409, "Conflict", "This booking has already started and cannot be cancelled.");
    }
    bookings.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // getRoom
  http.get("/api/rooms/:roomId", ({ params }) => {
    const room = rooms.find((r) => r.id === params.roomId);
    return room ? HttpResponse.json(room) : error(404, "Not found", "No such room.");
  }),
];

