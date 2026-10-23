import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  AlertTitle,
  AppBreadcrumbs,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  TextField,
} from "@wso2/oxygen-ui";
import { roomBookingApi } from "../api";
import type { components } from "../generated/room-booking-api";
import { errorMessage } from "../lib/apiMessage";
import { endsAfterStart, formatOfficeDate, formatOfficeRange, todayOffice } from "../lib/officeTime";
import { SLOTS, startSlots } from "../lib/slots";

type Room = components["schemas"]["Room"];

type RoomsLoad =
  | { kind: "loading" }
  | { kind: "ok"; rooms: Room[] }
  | { kind: "failed"; message: string };

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

export function BookPage(): ReactElement {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const today = todayOffice();

  const dateParam = params.get("date");
  const initialDate = dateParam && DATE_PARAM.test(dateParam) && dateParam >= today ? dateParam : today;
  const endParam = params.get("end");

  const [roomId, setRoomId] = useState(params.get("room") ?? "");
  const [date, setDate] = useState(initialDate);
  const [start, setStart] = useState(params.get("start") ?? "");
  const [end, setEnd] = useState(endParam && SLOTS.includes(endParam) ? endParam : "12:00");
  const [attendees, setAttendees] = useState(params.get("attendees") ?? "1");
  const [roomsLoad, setRoomsLoad] = useState<RoomsLoad>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fail = (message: string): void => {
      if (!cancelled) setRoomsLoad({ kind: "failed", message });
    };
    roomBookingApi
      .GET("/rooms", { params: { query: { limit: 100 } } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (data) setRoomsLoad({ kind: "ok", rooms: data.data });
        else fail(errorMessage(error, "The room list could not be loaded. Try again in a moment."));
      })
      .catch(() => fail("The room list could not be loaded. Try again in a moment."));
    return () => {
      cancelled = true;
    };
  }, []);

  const rooms = roomsLoad.kind === "ok" ? roomsLoad.rooms : [];
  const room = rooms.find((r) => r.id === roomId);
  // Once rooms are loaded, an unknown/missing room param falls back to the first room.
  useEffect(() => {
    if (roomsLoad.kind === "ok" && !roomsLoad.rooms.some((r) => r.id === roomId)) {
      setRoomId(roomsLoad.rooms[0]?.id ?? "");
    }
  }, [roomsLoad, roomId]);

  // Never offer a past start time. Keep the prefilled start when it is still valid.
  const starts = useMemo(() => startSlots(date), [date]);
  useEffect(() => {
    if (!starts.includes(start)) {
      const next = starts.includes("11:00") ? "11:00" : (starts[0] ?? "");
      setStart(next);
      // Keep the default range valid: when the corrected start passes the end, end one slot later.
      if (next && !endsAfterStart(next, end)) setEnd(SLOTS[SLOTS.indexOf(next) + 1] ?? end);
    }
  }, [starts, start, end]);

  const count = Number(attendees);
  const attendeesBad = !Number.isInteger(count) || count < 1;
  const dateBad = !date || date < today;
  const rangeBad = !!start && !endsAfterStart(start, end);
  const canSubmit = !!room && !!start && !attendeesBad && !dateBad && !rangeBad && !submitting;

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (!canSubmit || !room) return;
    setSubmitting(true);
    setRefusal(null);
    roomBookingApi
      .POST("/me/bookings", {
        body: { roomId: room.id, date, startTime: start, endTime: end, attendees: count },
      })
      .then(({ data, error }) => {
        if (data) {
          navigate("/my-bookings", {
            state: {
              booked: `${room.name} booked for ${formatOfficeDate(date)}, ${formatOfficeRange(start, end)}.`,
            },
          });
          return;
        }
        // The form keeps every value so nothing is lost.
        setRefusal(errorMessage(error, "The booking service is unavailable. Nothing was reserved. Try again in a moment."));
        setSubmitting(false);
      })
      .catch(() => {
        setRefusal("The booking service is unavailable. Nothing was reserved. Try again in a moment.");
        setSubmitting(false);
      });
  };

  return (
    <PageContent>
      <AppBreadcrumbs
        items={[
          { key: "rooms", label: "Rooms", onClick: () => navigate("/rooms") },
          { key: "book", label: "Book a room" },
        ]}
      />
      <PageTitle>
        <PageTitle.Header>Book a room</PageTitle.Header>
      </PageTitle>
      <Stack spacing={2}>
        {roomsLoad.kind === "failed" && (
          <Alert severity="error">
            <AlertTitle>Rooms unavailable</AlertTitle>
            {roomsLoad.message}
          </Alert>
        )}
        {refusal && (
          <Alert severity="error">
            <AlertTitle>Booking not made</AlertTitle>
            {refusal} Nothing was reserved.
          </Alert>
        )}
        <Card variant="outlined">
          <CardHeader title="Booking details" />
          <CardContent>
            {roomsLoad.kind === "loading" ? (
              <CircularProgress size={24} aria-label="Loading rooms" />
            ) : (
              <Stack spacing={2} component="form" onSubmit={submit} noValidate sx={{ maxWidth: 480 }}>
                <TextField
                  select
                  required
                  label="Room"
                  value={room ? roomId : ""}
                  onChange={(e) => setRoomId(e.target.value)}
                >
                  {rooms.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name} (up to {r.capacity})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  required
                  label="Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  error={dateBad}
                  helperText={dateBad ? "Pick today or a later day" : undefined}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today } }}
                />
                <TextField
                  select
                  required
                  label="Start"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  error={starts.length === 0}
                  helperText={starts.length === 0 ? "No start times left today" : undefined}
                >
                  {starts.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  required
                  label="End"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  error={rangeBad}
                  helperText={rangeBad ? "The end time must be after the start time" : undefined}
                >
                  {SLOTS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  required
                  label="Attendees"
                  type="number"
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                  error={attendeesBad}
                  helperText={attendeesBad ? "A whole number of at least 1" : undefined}
                  slotProps={{ htmlInput: { min: 1 } }}
                />
                <Stack direction="row" justifyContent="flex-end" spacing={2}>
                  <Button variant="outlined" onClick={() => navigate("/rooms")}>
                    Back to rooms
                  </Button>
                  <Button type="submit" variant="contained" disabled={!canSubmit}>
                    Book room
                  </Button>
                </Stack>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>
    </PageContent>
  );
}
