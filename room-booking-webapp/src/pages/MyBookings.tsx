import { useCallback, useEffect, useState, type ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  ListingTable,
  PageContent,
  PageTitle,
  Stack,
  Typography,
} from "@wso2/oxygen-ui";
import { roomBookingApi } from "../api";
import type { components } from "../generated/room-booking-api";
import { errorMessage } from "../lib/apiMessage";
import { formatOfficeDate, hhmm } from "../lib/officeTime";

type Booking = components["schemas"]["Booking"];

const MAX_UPCOMING = 2;
const LOAD_FAILED = "Your bookings could not be loaded. Try again in a moment.";

type Load =
  | { kind: "loading" }
  | { kind: "ok"; bookings: Booking[] }
  | { kind: "failed"; message: string };

const startKey = (b: Booking): string => `${b.date} ${hhmm(b.startTime)}`;

/** Upcoming first (soonest at the top), then started ones (most recent first). */
function ordered(bookings: Booking[]): Booking[] {
  const upcoming = bookings.filter((b) => b.status === "upcoming").sort((a, b) => startKey(a).localeCompare(startKey(b)));
  const past = bookings.filter((b) => b.status !== "upcoming").sort((a, b) => startKey(b).localeCompare(startKey(a)));
  return [...upcoming, ...past];
}

function StatTile(props: { label: string; value: number; hint: string; color?: "success" | "warning" }): ReactElement {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="overline" color={props.color ? `${props.color}.main` : "text.secondary"}>
          {props.label}
        </Typography>
        <Typography variant="h4">{props.value}</Typography>
        <Typography variant="caption" color="text.secondary">
          {props.hint}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function MyBookingsPage(): ReactElement {
  const navigate = useNavigate();
  const state = useLocation().state as { booked?: string } | null;
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [reload, setReload] = useState(0);
  const [target, setTarget] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Always a fresh request on open (no cache), so a booking just made shows up.
  useEffect(() => {
    let cancelled = false;
    roomBookingApi
      .GET("/me/bookings", { params: { query: { limit: 100 } } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (data) setLoad({ kind: "ok", bookings: data.data });
        else setLoad({ kind: "failed", message: errorMessage(error, LOAD_FAILED) });
      })
      .catch(() => {
        if (!cancelled) setLoad({ kind: "failed", message: LOAD_FAILED });
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const refresh = useCallback((): void => {
    setLoad({ kind: "loading" });
    setReload((n) => n + 1);
  }, []);

  const closeDialog = (): void => {
    if (cancelling) return;
    setTarget(null);
    setCancelError(null);
  };

  const confirmCancel = (): void => {
    if (!target) return;
    setCancelling(true);
    setCancelError(null);
    roomBookingApi
      .DELETE("/me/bookings/{bookingId}", { params: { path: { bookingId: target.id } } })
      .then(({ response, error }) => {
        setCancelling(false);
        if (response.ok) {
          setNotice(`Cancelled ${target.roomName}, ${formatOfficeDate(target.date)}.`);
          setTarget(null);
          refresh();
          return;
        }
        // 404 (not yours / gone) and 409 (already started): say why, then show the truth.
        setCancelError(errorMessage(error, "The booking could not be cancelled. Try again in a moment."));
        if (response.status === 404 || response.status === 409) refresh();
      })
      .catch(() => {
        setCancelling(false);
        setCancelError("The booking could not be cancelled. Try again in a moment.");
      });
  };

  const rows = load.kind === "ok" ? ordered(load.bookings) : [];
  const upcomingCount = rows.filter((b) => b.status === "upcoming").length;
  const pastCount = rows.length - upcomingCount;

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>My bookings</PageTitle.Header>
        <PageTitle.Actions>
          <Button variant="contained" onClick={() => navigate("/rooms")}>
            Book a room
          </Button>
        </PageTitle.Actions>
      </PageTitle>
      <Stack spacing={3}>
        {state?.booked && (
          <Alert severity="success">
            <AlertTitle>Room booked</AlertTitle>
            {state.booked}
          </Alert>
        )}
        {notice && (
          <Alert severity="success" onClose={() => setNotice(null)}>
            {notice}
          </Alert>
        )}
        {load.kind === "failed" && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={refresh}>
                Retry
              </Button>
            }
          >
            <AlertTitle>Bookings unavailable</AlertTitle>
            {load.message}
          </Alert>
        )}
        {cancelError && !target && (
          <Alert severity="warning" onClose={() => setCancelError(null)}>
            <AlertTitle>Booking not cancelled</AlertTitle>
            {cancelError}
          </Alert>
        )}

        {load.kind === "ok" && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <StatTile
                label="Upcoming"
                value={upcomingCount}
                hint={`of ${MAX_UPCOMING} allowed`}
                color={upcomingCount >= MAX_UPCOMING ? "warning" : "success"}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <StatTile label="Past" value={pastCount} hint="already started" />
            </Grid>
          </Grid>
        )}

        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="h6">Bookings I made</Typography>
            {load.kind === "ok" && <Chip size="small" label={rows.length} />}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Upcoming first, soonest at the top. Cancelling removes a booking.
          </Typography>
          <ListingTable.Container>
            <ListingTable>
              <ListingTable.Head>
                <ListingTable.Row>
                  <ListingTable.Cell>Room</ListingTable.Cell>
                  <ListingTable.Cell>Date</ListingTable.Cell>
                  <ListingTable.Cell>Start</ListingTable.Cell>
                  <ListingTable.Cell>End</ListingTable.Cell>
                  <ListingTable.Cell align="right">Attendees</ListingTable.Cell>
                  <ListingTable.Cell>Status</ListingTable.Cell>
                  <ListingTable.Cell />
                </ListingTable.Row>
              </ListingTable.Head>
              <ListingTable.Body>
                {load.kind === "loading" && (
                  <ListingTable.Row>
                    <ListingTable.Cell colSpan={7} align="center">
                      <Box sx={{ p: 2 }}>
                        <CircularProgress size={24} aria-label="Loading bookings" />
                      </Box>
                    </ListingTable.Cell>
                  </ListingTable.Row>
                )}
                {load.kind === "ok" && rows.length === 0 && (
                  <ListingTable.Row>
                    <ListingTable.Cell colSpan={7}>
                      <ListingTable.EmptyState
                        title="No bookings yet"
                        description="Rooms you book appear here."
                        action={
                          <Button variant="outlined" onClick={() => navigate("/rooms")}>
                            Find a room
                          </Button>
                        }
                      />
                    </ListingTable.Cell>
                  </ListingTable.Row>
                )}
                {rows.map((b) => {
                  const isUpcoming = b.status === "upcoming";
                  return (
                    <ListingTable.Row key={b.id}>
                      <ListingTable.Cell>{b.roomName}</ListingTable.Cell>
                      <ListingTable.Cell>{formatOfficeDate(b.date)}</ListingTable.Cell>
                      <ListingTable.Cell>{hhmm(b.startTime)}</ListingTable.Cell>
                      <ListingTable.Cell>{hhmm(b.endTime)}</ListingTable.Cell>
                      <ListingTable.Cell align="right">{b.attendees}</ListingTable.Cell>
                      <ListingTable.Cell>
                        <Chip
                          size="small"
                          label={isUpcoming ? "Upcoming" : "Past"}
                          color={isUpcoming ? "info" : "default"}
                          variant={isUpcoming ? "filled" : "outlined"}
                        />
                      </ListingTable.Cell>
                      <ListingTable.Cell align="right">
                        {isUpcoming && (
                          <ListingTable.RowActions visibility="always" align="right">
                            <Button
                              size="small"
                              variant="text"
                              color="error"
                              onClick={() => {
                                setCancelError(null);
                                setTarget(b);
                              }}
                            >
                              Cancel
                            </Button>
                          </ListingTable.RowActions>
                        )}
                      </ListingTable.Cell>
                    </ListingTable.Row>
                  );
                })}
              </ListingTable.Body>
            </ListingTable>
          </ListingTable.Container>
        </Stack>
      </Stack>

      <Dialog open={target !== null} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle>Cancel this booking?</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {target && (
              <DialogContentText>
                {target.roomName}, {formatOfficeDate(target.date)}, {hhmm(target.startTime)} – {hhmm(target.endTime)}.
                Cancelling removes the booking and frees the room.
              </DialogContentText>
            )}
            {cancelError && <Alert severity="error">{cancelError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={closeDialog} disabled={cancelling}>
            Keep booking
          </Button>
          <Button variant="contained" color="error" onClick={confirmCancel} disabled={cancelling}>
            Cancel booking
          </Button>
        </DialogActions>
      </Dialog>
    </PageContent>
  );
}
