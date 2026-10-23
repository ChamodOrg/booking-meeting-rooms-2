# Product-wide

Rules that apply to more than one feature.

## Requirements

- P1 Every user signs in via SSO through the platform identity provider, so bookings are attributable to a real person. \[room-booking-prd.md · User Stories 1\] \[org default\] Applies to: all.
- P2 All times are the office's local time; no time zones are handled. \[room-booking-prd.md · Product Decisions\] Applies to: F1, F2, F3.
- P3 Search and booking apply the same room-level rules (no time overlap, attendees within capacity). \[room-booking-prd.md · Product Decisions\] Applies to: F1, F2.
- P4 A Member may cancel only bookings they made themselves. \[room-booking-prd.md · Actors; User Stories 9\] Applies to: F3.

## Decisions

- The office's rooms are a fixed set the app does not manage; name, capacity and location are seeded at deployment.
- Two bookings for the same room clash when their time ranges overlap at all; bookings that merely touch (one ends exactly when the next begins) do not clash.
- A booking is refused when its attendee count exceeds the room's capacity; exactly the capacity is allowed.
- A room is excluded from a search when it is booked for any part of the requested range or its capacity is below the requested group size.
- A refused booking is reported with its reason, and nothing is reserved.
- A booking whose start is in the past cannot be made; the app does not offer past times.
- A Member may hold at most two bookings starting in the future; a third is refused until one is cancelled or has passed.
- Bookings are for a single day: start and end are on the same date.
- Room capacity is a whole number of people; room names are unique across the office.
- Cancelling a booking removes it; there is no cancellation history or audit trail.

