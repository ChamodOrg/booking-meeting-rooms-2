import { useState, type ReactNode } from "react";
import {
  Alert, AppShell, Breadcrumbs, Button, Detail, EmptyState, Field, Filters, Form, Heading, Screen, Section,
  Stat, StatGroup, Table, ValidationSummary, defineApp, useCollection, useDisplayState, useNav, useParams, useToday,
} from "@wso2/prototype-kit";

interface Room { id: string; name: string; capacity: number; location: string }
interface Booking { id: string; roomId: string; memberId: string; date: string; start: string; end: string; attendees: number }

const ME = "member.asha";
const NOW = "10:00";
const MAX_UPCOMING = 2;

const SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00",
  "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00",
];

const rooms: Room[] = [
  { id: "atlas", name: "Atlas", capacity: 4, location: "Floor 1, east wing" },
  { id: "borealis", name: "Borealis", capacity: 6, location: "Floor 1, west wing" },
  { id: "cedar", name: "Cedar", capacity: 10, location: "Floor 2, east wing" },
  { id: "delta", name: "Delta", capacity: 2, location: "Floor 2, phone nook" },
  { id: "everest", name: "Everest", capacity: 16, location: "Floor 3, boardroom" },
];

const bookings: Booking[] = [
  { id: "b1", roomId: "atlas", memberId: "member.ravi", date: "2026-01-15", start: "11:00", end: "12:00", attendees: 3 },
  { id: "b2", roomId: "borealis", memberId: ME, date: "2026-01-15", start: "13:00", end: "14:00", attendees: 5 },
  { id: "b3", roomId: "cedar", memberId: "member.ana", date: "2026-01-16", start: "09:00", end: "10:30", attendees: 8 },
  { id: "b4", roomId: "everest", memberId: "member.ravi", date: "2026-01-16", start: "14:00", end: "15:00", attendees: 12 },
  { id: "b5", roomId: "atlas", memberId: ME, date: "2026-01-14", start: "15:00", end: "16:00", attendees: 3 },
];

const user = { name: "Asha Perera", email: "asha@office.example" };

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => aStart < bEnd && aEnd > bStart;
const key = (b: Booking) => `${b.date} ${b.start}`;
const isUpcoming = (b: Booking, today: string) => key(b) > `${today} ${NOW}`;

function Shell({ children }: { children: ReactNode }) {
  return (
    <AppShell
      id="shell"
      user={user}
      nav={[
        { id: "nav.rooms", label: "Rooms", to: "screen.rooms" },
        { id: "nav.my-bookings", label: "My bookings", to: "screen.my-bookings" },
      ]}
      account="screen.account"
      signOut="screen.signed-out"
    >
      {children}
    </AppShell>
  );
}

function Rooms() {
  const state = useDisplayState();
  const today = useToday();
  const allRooms = useCollection<Room>("rooms");
  const allBookings = useCollection<Booking>("bookings");
  const [date, setDate] = useState(today);
  const [start, setStart] = useState("11:00");
  const [end, setEnd] = useState("12:00");
  const [group, setGroup] = useState("1");
  const [searching, setSearching] = useState(false);

  const rangeBad = end <= start;
  const sorted = [...allRooms.items].sort((a, b) => a.name.localeCompare(b.name));
  const found = searching
    ? sorted.filter(
        (r) =>
          r.capacity >= Number(group || "0") &&
          !allBookings.items.some((b) => b.roomId === r.id && b.date === date && overlaps(start, end, b.start, b.end)),
      )
    : sorted;
  const shown = state === "state.empty" || (searching && rangeBad) ? [] : found;

  return (
    <Shell>
      <Heading id="heading.rooms" text="Rooms" />
      {state === "state.failed" && (
        <Alert id="alert.rooms-failed" tone="error" title="Rooms unavailable" text="The room list could not be loaded. Try again in a moment." />
      )}
      <Section id="section.search" title="Find a free room" subtitle="Rooms free for the whole range that hold your group.">
        <Filters id="filters.search">
          <Field id="field.date" label="Date" type="date" value={date} onChange={setDate} />
          <Field id="field.start" label="Start" type="select" options={SLOTS} value={start} onChange={setStart} />
          <Field
            id="field.end"
            label="End"
            type="select"
            options={SLOTS}
            value={end}
            onChange={setEnd}
            error={state === "state.validation-error" || (searching && rangeBad) ? "The end time must be after the start time" : undefined}
          />
          <Field id="field.group" label="Group size" type="number" value={group} onChange={setGroup} />
          <Button id="btn.search" label="Search" emphasis="primary" onPress={() => setSearching(true)} />
          <Button id="btn.clear" label="Clear" onPress={() => setSearching(false)} />
        </Filters>
      </Section>
      <Section
        id="section.rooms"
        title={searching ? "Free rooms" : "All rooms"}
        count={shown.length}
        subtitle="Alphabetical. Open a room to see when it is busy."
      >
        <Table
          id="table.rooms"
          columns={["Room", "Location", { label: "Capacity", kind: "number" }]}
          rows={shown.map((r) => ({
            id: `room.${r.id}`,
            cells: [r.name, r.location, String(r.capacity)],
            to: "screen.room",
            params: { room: r.id },
            actions: [
              {
                id: `room.${r.id}.book`,
                label: "Book",
                to: "screen.book",
                params: { room: r.id, date, start, end, attendees: group || "1" },
              },
            ],
          }))}
          empty={<EmptyState id="empty.rooms" title="No room matches" text="Try another time or a smaller group." />}
        />
      </Section>
    </Shell>
  );
}

function RoomDetail() {
  const { room: roomId } = useParams();
  const state = useDisplayState();
  const today = useToday();
  const allRooms = useCollection<Room>("rooms");
  const allBookings = useCollection<Booking>("bookings");
  const [date, setDate] = useState(today);
  const room = (roomId ? allRooms.get(roomId) : undefined) ?? allRooms.items[0]!;
  const busy =
    state === "state.empty"
      ? []
      : allBookings.items.filter((b) => b.roomId === room.id && b.date === date).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <Shell>
      <Breadcrumbs
        id="crumbs.room"
        items={[
          { id: "crumb.rooms", label: "Rooms", to: "screen.rooms" },
          { id: "crumb.room", label: room.name },
        ]}
      />
      <Heading
        id="heading.room"
        text={room.name}
        actions={<Button id="btn.book-room" label="Book this room" emphasis="primary" to="screen.book" params={{ room: room.id, date }} />}
      />
      {state === "state.failed" && (
        <Alert id="alert.busy-failed" tone="error" title="Busy times unavailable" text="This room's schedule could not be loaded." />
      )}
      <Detail
        id="detail.room"
        fields={[
          { label: "Room", value: room.name },
          { label: "Capacity", value: `${room.capacity} people` },
          { label: "Location", value: room.location },
        ]}
      />
      <Section id="section.busy" title="Busy times" count={busy.length} subtitle="When this room is already taken on the chosen day.">
        <Filters id="filters.busy">
          <Field id="field.busy-date" label="Day" type="date" value={date} onChange={setDate} />
        </Filters>
        <Table
          id="table.busy"
          columns={["From", "To"]}
          rows={busy.map((b) => ({ id: `busy.${b.id}`, cells: [b.start, b.end] }))}
          empty={<EmptyState id="empty.busy" title="Free all day" text="Nothing is booked in this room on that day." />}
        />
      </Section>
    </Shell>
  );
}

function BookRoom() {
  const params = useParams();
  const state = useDisplayState();
  const today = useToday();
  const navigate = useNav();
  const allRooms = useCollection<Room>("rooms");
  const allBookings = useCollection<Booking>("bookings");
  const first = (params.room ? allRooms.get(params.room) : undefined) ?? allRooms.items[0]!;
  const [roomName, setRoomName] = useState(first.name);
  const [date, setDate] = useState(params.date ?? today);
  const [start, setStart] = useState(params.start ?? "11:00");
  const [end, setEnd] = useState(params.end ?? "12:00");
  const [attendees, setAttendees] = useState(params.attendees ?? "1");
  const [errors, setErrors] = useState<string[]>([]);

  const submit = () => {
    const room = allRooms.items.find((r) => r.name === roomName) ?? first;
    const n = Number(attendees);
    const issues: string[] = [];
    if (!Number.isInteger(n) || n < 1) issues.push("Attendees must be a whole number of at least 1.");
    if (date < today || (date === today && start <= NOW)) issues.push("The start time has already passed. Pick a future start.");
    if (end <= start) issues.push("The end time must be after the start time.");
    if (n > room.capacity) issues.push(`${room.name} holds ${room.capacity} people; ${n} attendees are too many.`);
    const clash = allBookings.items.find((b) => b.roomId === room.id && b.date === date && overlaps(start, end, b.start, b.end));
    if (clash) issues.push(`${room.name} is already booked from ${clash.start} to ${clash.end} on ${date}.`);
    const upcoming = allBookings.items.filter((b) => b.memberId === ME && isUpcoming(b, today)).length;
    if (upcoming >= MAX_UPCOMING) issues.push("You already hold two upcoming bookings. Cancel one to book another.");
    setErrors(issues);
    if (issues.length === 0) {
      allBookings.create({ roomId: room.id, memberId: ME, date, start, end, attendees: n });
      navigate.go("screen.my-bookings");
    }
  };

  const shownIssues =
    errors.length > 0
      ? errors
      : state === "state.validation-error"
        ? ["Atlas is already booked from 11:00 to 12:00 on 2026-01-15.", "Atlas holds 4 people; 6 attendees are too many."]
        : [];

  return (
    <Shell>
      <Breadcrumbs
        id="crumbs.book"
        items={[
          { id: "crumb.rooms", label: "Rooms", to: "screen.rooms" },
          { id: "crumb.book", label: "Book a room" },
        ]}
      />
      <Heading id="heading.book" text="Book a room" />
      {state === "state.failed" && (
        <Alert id="alert.book-failed" tone="error" title="Booking service unavailable" text="Nothing was reserved. Try again in a moment." />
      )}
      {shownIssues.length > 0 && (
        <>
          <Alert id="alert.refused" tone="error" title="Booking not made" text="Nothing was reserved." />
          <ValidationSummary id="summary.book" issues={shownIssues} />
        </>
      )}
      <Form
        id="form.book"
        title="Booking details"
        onSubmit={() => submit()}
        actions={
          <>
            <Button id="btn.book.submit" label="Book room" emphasis="primary" submit />
            <Button id="btn.book.back" label="Back to rooms" to="screen.rooms" />
          </>
        }
      >
        <Field id="field.room" label="Room" type="select" options={allRooms.items.map((r) => r.name)} value={roomName} onChange={setRoomName} />
        <Field id="field.date" label="Date" type="date" value={date} onChange={setDate} />
        <Field id="field.start" label="Start" type="select" options={SLOTS} value={start} onChange={setStart} />
        <Field id="field.end" label="End" type="select" options={SLOTS} value={end} onChange={setEnd} />
        <Field id="field.attendees" label="Attendees" type="number" value={attendees} onChange={setAttendees} />
      </Form>
    </Shell>
  );
}

function MyBookings() {
  const state = useDisplayState();
  const today = useToday();
  const allRooms = useCollection<Room>("rooms");
  const all = useCollection<Booking>("bookings");
  const mine = all.items.filter((b) => b.memberId === ME);
  const upcoming = mine.filter((b) => isUpcoming(b, today)).sort((a, b) => key(a).localeCompare(key(b)));
  const past = mine.filter((b) => !isUpcoming(b, today)).sort((a, b) => key(b).localeCompare(key(a)));
  const rows = state === "state.empty" ? [] : [...upcoming, ...past];
  const roomName = (b: Booking) => allRooms.get(b.roomId)?.name ?? b.roomId;

  return (
    <Shell>
      <Heading id="heading.my-bookings" text="My bookings" />
      {state === "state.failed" && (
        <Alert id="alert.mine-failed" tone="error" title="Bookings unavailable" text="Your bookings could not be loaded." />
      )}
      <StatGroup>
        <Stat
          id="stat.upcoming"
          label="Upcoming"
          value={String(upcoming.length)}
          hint={`of ${MAX_UPCOMING} allowed`}
          icon="CalendarCheck"
          tone={upcoming.length >= MAX_UPCOMING ? "warning" : "success"}
        />
        <Stat id="stat.past" label="Past" value={String(past.length)} hint="already started" icon="Clock" />
      </StatGroup>
      <Section
        id="section.mine"
        title="Bookings I made"
        count={rows.length}
        subtitle="Upcoming first, soonest at the top. Cancelling removes a booking."
        actions={<Button id="btn.new-booking" label="Book a room" emphasis="primary" to="screen.rooms" />}
      >
        <Table
          id="table.mine"
          columns={["Room", "Date", "Start", "End", { label: "Attendees", kind: "number" }, { label: "Status", kind: "status" }]}
          rows={rows.map((b) => {
            const isNext = isUpcoming(b, today);
            return {
              id: `booking.${b.id}`,
              cells: [roomName(b), b.date, b.start, b.end, String(b.attendees)],
              status: isNext ? { text: "Upcoming", tone: "info" as const } : { text: "Past", tone: "default" as const },
              actions: isNext
                ? [{ id: `booking.${b.id}.cancel`, label: "Cancel", emphasis: "danger" as const, onPress: () => all.remove(b.id) }]
                : [],
            };
          })}
          empty={
            <EmptyState
              id="empty.mine"
              title="No bookings yet"
              text="Rooms you book appear here."
              actions={<Button id="btn.empty.book" label="Find a room" to="screen.rooms" />}
            />
          }
        />
      </Section>
    </Shell>
  );
}

function Account() {
  return (
    <Shell>
      <Heading id="heading.account" text="Account" />
      <Detail
        id="detail.account"
        fields={[
          { label: "Name", value: user.name },
          { label: "Email", value: user.email },
          { label: "Role", value: "Member" },
        ]}
      />
    </Shell>
  );
}

function SignedOut() {
  return (
    <Screen>
      <Heading id="heading.signed-out" text="You are signed out" />
      <Button id="btn.sign-in" label="Sign in" emphasis="primary" to="screen.rooms" />
    </Screen>
  );
}

export default defineApp({
  screens: {
    "screen.rooms": Rooms,
    "screen.room": RoomDetail,
    "screen.book": BookRoom,
    "screen.my-bookings": MyBookings,
    "screen.account": Account,
    "screen.signed-out": SignedOut,
  },
  data: { rooms, bookings },
});
