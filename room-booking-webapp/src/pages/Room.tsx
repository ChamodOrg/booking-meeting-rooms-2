import { useEffect, useState, type ReactElement } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AlertTitle,
  AppBreadcrumbs,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Grid,
  ListingTable,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { roomBookingApi } from "../api";
import type { components } from "../generated/room-booking-api";
import { errorMessage } from "../lib/apiMessage";
import { hhmm, todayOffice } from "../lib/officeTime";

type Room = components["schemas"]["Room"];
type BusyTime = components["schemas"]["BusyTime"];

type RoomLoad =
  | { kind: "loading" }
  | { kind: "ok"; room: Room }
  | { kind: "notFound" }
  | { kind: "failed" };

type BusyLoad =
  | { kind: "loading" }
  | { kind: "ok"; busy: BusyTime[] }
  | { kind: "failed"; message: string };

export function RoomPage(): ReactElement {
  const { room: roomId } = useParams();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayOffice());
  const [roomLoad, setRoomLoad] = useState<RoomLoad>({ kind: "loading" });
  const [busyLoad, setBusyLoad] = useState<BusyLoad>({ kind: "loading" });

  useEffect(() => {
    if (!roomId) {
      setRoomLoad({ kind: "notFound" });
      return;
    }
    let cancelled = false;
    setRoomLoad({ kind: "loading" });
    roomBookingApi
      .GET("/rooms/{roomId}", { params: { path: { roomId } } })
      .then(({ data, response }) => {
        if (cancelled) return;
        if (data) setRoomLoad({ kind: "ok", room: data });
        else setRoomLoad(response.status === 404 ? { kind: "notFound" } : { kind: "failed" });
      })
      .catch(() => {
        if (!cancelled) setRoomLoad({ kind: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !date) return;
    let cancelled = false;
    setBusyLoad({ kind: "loading" });
    roomBookingApi
      .GET("/rooms/{roomId}/busy-times", {
        params: { path: { roomId }, query: { date, limit: 100 } },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (data) setBusyLoad({ kind: "ok", busy: data.data });
        else setBusyLoad({ kind: "failed", message: errorMessage(error, "This room's schedule could not be loaded.") });
      })
      .catch(() => {
        if (!cancelled) setBusyLoad({ kind: "failed", message: "This room's schedule could not be loaded." });
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, date]);

  if (roomLoad.kind === "loading") {
    return (
      <PageContent>
        <Stack sx={{ alignItems: "center", p: 4 }}>
          <CircularProgress size={24} aria-label="Loading room" />
        </Stack>
      </PageContent>
    );
  }

  if (roomLoad.kind === "notFound" || roomLoad.kind === "failed") {
    return (
      <PageContent>
        <PageTitle>
          <PageTitle.Header>Room not found</PageTitle.Header>
        </PageTitle>
        <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
          <Alert severity={roomLoad.kind === "notFound" ? "warning" : "error"}>
            <AlertTitle>{roomLoad.kind === "notFound" ? "No such room" : "Room unavailable"}</AlertTitle>
            {roomLoad.kind === "notFound"
              ? "This room does not exist."
              : "The room could not be loaded. Try again in a moment."}
          </Alert>
          <Button component={RouterLink} to="/rooms" variant="outlined">
            Back to rooms
          </Button>
        </Stack>
      </PageContent>
    );
  }

  const room = roomLoad.room;
  const busy = busyLoad.kind === "ok" ? busyLoad.busy : [];
  const fields = [
    { label: "Room", value: room.name },
    { label: "Capacity", value: `${room.capacity} people` },
    { label: "Location", value: room.location },
  ];

  return (
    <PageContent>
      <AppBreadcrumbs
        items={[
          { key: "rooms", label: "Rooms", onClick: () => navigate("/rooms") },
          { key: "room", label: room.name },
        ]}
      />
      <PageTitle>
        <PageTitle.Header>{room.name}</PageTitle.Header>
        <PageTitle.Actions>
          <Button
            variant="contained"
            onClick={() => navigate(`/book?${new URLSearchParams({ room: room.id, date }).toString()}`)}
          >
            Book this room
          </Button>
        </PageTitle.Actions>
      </PageTitle>
      <Stack spacing={3}>
        <Card variant="outlined">
          <CardHeader title="Details" />
          <CardContent>
            <Grid container spacing={2}>
              {fields.map((f) => (
                <Grid key={f.label} size={{ xs: 12, md: 4 }}>
                  <Typography variant="overline" color="text.secondary">
                    {f.label}
                  </Typography>
                  <Typography variant="body2">{f.value}</Typography>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {busyLoad.kind === "failed" && (
          <Alert severity="error">
            <AlertTitle>Busy times unavailable</AlertTitle>
            {busyLoad.message}
          </Alert>
        )}

        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="h6">Busy times</Typography>
            {busyLoad.kind === "ok" && <Chip size="small" label={busy.length} />}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            When this room is already taken on the chosen day.
          </Typography>
          <Box>
            <TextField
              label="Day"
              type="date"
              size="small"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
          <ListingTable.Container>
            <ListingTable>
              <ListingTable.Head>
                <ListingTable.Row>
                  <ListingTable.Cell>From</ListingTable.Cell>
                  <ListingTable.Cell>To</ListingTable.Cell>
                </ListingTable.Row>
              </ListingTable.Head>
              <ListingTable.Body>
                {busyLoad.kind === "loading" && (
                  <ListingTable.Row>
                    <ListingTable.Cell colSpan={2} align="center">
                      <Box sx={{ p: 2 }}>
                        <CircularProgress size={24} aria-label="Loading busy times" />
                      </Box>
                    </ListingTable.Cell>
                  </ListingTable.Row>
                )}
                {busyLoad.kind === "ok" && busy.length === 0 && (
                  <ListingTable.Row>
                    <ListingTable.Cell colSpan={2}>
                      <ListingTable.EmptyState
                        title="Free all day"
                        description="Nothing is booked in this room on that day."
                      />
                    </ListingTable.Cell>
                  </ListingTable.Row>
                )}
                {busy.map((b) => (
                  <ListingTable.Row key={`${b.date}-${b.startTime}-${b.endTime}`}>
                    <ListingTable.Cell>{hhmm(b.startTime)}</ListingTable.Cell>
                    <ListingTable.Cell>{hhmm(b.endTime)}</ListingTable.Cell>
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
