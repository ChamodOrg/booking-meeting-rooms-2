import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  ListingTable,
  MenuItem,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { roomBookingApi } from "../api";
import type { components } from "../generated/room-booking-api";
import { errorMessage } from "../lib/apiMessage";
import { endsAfterStart, isPast, todayOffice } from "../lib/officeTime";
import { SLOTS, startSlots } from "../lib/slots";

type Room = components["schemas"]["Room"];

interface Search {
  date: string;
  startTime: string;
  endTime: string;
  minCapacity: number;
}

type Load =
  | { kind: "loading" }
  | { kind: "ok"; rooms: Room[] }
  | { kind: "failed"; message: string };

export function RoomsPage(): ReactElement {
  const navigate = useNavigate();
  const today = todayOffice();
  const [date, setDate] = useState(today);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("12:00");
  const [group, setGroup] = useState("1");
  const [applied, setApplied] = useState<Search | null>(null);
  const [load, setLoad] = useState<Load>({ kind: "loading" });

  const starts = useMemo(() => startSlots(date), [date]);
  // Keep the chosen start valid: never a past one.
  useEffect(() => {
    if (!starts.includes(start)) {
      const next = starts.includes("11:00") ? "11:00" : (starts[0] ?? "");
      setStart(next);
      // Keep the default range valid: when the corrected start passes the end, end one slot later.
      if (next && !endsAfterStart(next, end)) setEnd(SLOTS[SLOTS.indexOf(next) + 1] ?? end);
    }
  }, [starts, start, end]);

  const groupSize = Number(group);
  const groupBad = !Number.isInteger(groupSize) || groupSize < 1;
  const dateBad = !date || date < today;
  const rangeBad = !!start && !endsAfterStart(start, end);
  const canSearch = !!start && !groupBad && !dateBad && !rangeBad && !isPast(date, start);

  useEffect(() => {
    let cancelled = false;
    setLoad({ kind: "loading" });
    roomBookingApi
      .GET("/rooms", {
        params: {
          query: applied
            ? {
                date: applied.date,
                startTime: applied.startTime,
                endTime: applied.endTime,
                minCapacity: applied.minCapacity,
                limit: 100,
              }
            : { limit: 100 },
        },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (data) setLoad({ kind: "ok", rooms: data.data });
        else setLoad({ kind: "failed", message: errorMessage(error, "The room list could not be loaded. Try again in a moment.") });
      })
      .catch(() => {
        if (!cancelled) setLoad({ kind: "failed", message: "The room list could not be loaded. Try again in a moment." });
      });
    return () => {
      cancelled = true;
    };
  }, [applied]);

  const search = (): void => {
    if (canSearch) setApplied({ date, startTime: start, endTime: end, minCapacity: groupSize });
  };
  const clear = (): void => setApplied(null);

  const rooms = load.kind === "ok" ? load.rooms : [];
  const bookParams = (roomId: string): string => {
    const p = new URLSearchParams({ room: roomId });
    if (applied) {
      p.set("date", applied.date);
      p.set("start", applied.startTime);
      p.set("end", applied.endTime);
      p.set("attendees", String(applied.minCapacity));
    }
    return p.toString();
  };

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Rooms</PageTitle.Header>
      </PageTitle>
      <Stack spacing={3}>
        {load.kind === "failed" && (
          <Alert severity="error">
            <AlertTitle>Rooms unavailable</AlertTitle>
            {load.message}
          </Alert>
        )}

        <Stack spacing={1}>
          <Typography variant="h6">Find a free room</Typography>
          <Typography variant="body2" color="text.secondary">
            Rooms free for the whole range that hold your group.
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            useFlexGap
            sx={{ flexWrap: "wrap", alignItems: "flex-start", pt: 1 }}
            component="form"
            onSubmit={(e: React.FormEvent) => {
              e.preventDefault();
              search();
            }}
          >
            <TextField
              label="Date"
              type="date"
              size="small"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              error={dateBad}
              helperText={dateBad ? "Pick today or a later day" : undefined}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today } }}
            />
            <TextField
              select
              label="Start"
              size="small"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              sx={{ minWidth: 110 }}
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
              label="End"
              size="small"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              sx={{ minWidth: 110 }}
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
              label="Group size"
              type="number"
              size="small"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              error={groupBad}
              helperText={groupBad ? "A whole number of at least 1" : undefined}
              slotProps={{ htmlInput: { min: 1 } }}
              sx={{ width: 130 }}
            />
            <Button type="submit" variant="contained" disabled={!canSearch} sx={{ mt: 0.25 }}>
              Search
            </Button>
            <Button variant="outlined" onClick={clear} sx={{ mt: 0.25 }}>
              Clear
            </Button>
          </Stack>
        </Stack>

        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="h6">{applied ? "Free rooms" : "All rooms"}</Typography>
            {load.kind === "ok" && <Chip size="small" label={rooms.length} />}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Alphabetical. Open a room to see when it is busy.
          </Typography>
          <ListingTable.Container>
            <ListingTable>
              <ListingTable.Head>
                <ListingTable.Row>
                  <ListingTable.Cell>Room</ListingTable.Cell>
                  <ListingTable.Cell>Location</ListingTable.Cell>
                  <ListingTable.Cell align="right">Capacity</ListingTable.Cell>
                  <ListingTable.Cell />
                </ListingTable.Row>
              </ListingTable.Head>
              <ListingTable.Body>
                {load.kind === "loading" && (
                  <ListingTable.Row>
                    <ListingTable.Cell colSpan={4} align="center">
                      <Box sx={{ p: 2 }}>
                        <CircularProgress size={24} aria-label="Loading rooms" />
                      </Box>
                    </ListingTable.Cell>
                  </ListingTable.Row>
                )}
                {load.kind === "ok" && rooms.length === 0 && (
                  <ListingTable.Row>
                    <ListingTable.Cell colSpan={4}>
                      <ListingTable.EmptyState
                        title={applied ? "No rooms found" : "No rooms"}
                        description={
                          applied
                            ? "No room is free for that range and group size. Try another time or a smaller group."
                            : "There are no rooms to show."
                        }
                      />
                    </ListingTable.Cell>
                  </ListingTable.Row>
                )}
                {rooms.map((r) => (
                  <ListingTable.Row
                    key={r.id}
                    clickable
                    onClick={() => navigate(`/room/${encodeURIComponent(r.id)}`)}
                  >
                    <ListingTable.Cell>{r.name}</ListingTable.Cell>
                    <ListingTable.Cell>{r.location}</ListingTable.Cell>
                    <ListingTable.Cell align="right">{r.capacity}</ListingTable.Cell>
                    <ListingTable.Cell align="right" onClick={(e) => e.stopPropagation()}>
                      <ListingTable.RowActions visibility="always" align="right">
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => navigate(`/book?${bookParams(r.id)}`)}
                        >
                          Book
                        </Button>
                      </ListingTable.RowActions>
                    </ListingTable.Cell>
                  </ListingTable.Row>
                ))}
              </ListingTable.Body>
            </ListingTable>
          </ListingTable.Container>
        </Stack>
      </Stack>
    </PageContent>
  );
}
