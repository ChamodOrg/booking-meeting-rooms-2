# Book a room

## Purpose

A Member books a room for a date, start and end time and attendee count; clashes, over-capacity, past-start and over-limit bookings are refused with a clear reason.

Needs: F1.

## User Stories

- F2.1 As a Member, I book a room for a date, a start and end time and a number of attendees, so the room is reserved for my meeting. \[room-booking-prd.md · User Stories 4\]
- F2.2 As a Member, I am told with a clear reason when my booking clashes with an existing booking for the same room, and nothing is reserved. \[room-booking-prd.md · User Stories 5\]
- F2.3 As a Member, I am told with a clear reason when my attendee count exceeds the room's capacity, and nothing is reserved. \[room-booking-prd.md · User Stories 6\]
- F2.4 As a Member, I am told with a clear reason when I already hold two future bookings, and nothing is reserved. \[room-booking-prd.md · Product Decisions\]
- F2.5 As a Member, I am not offered a past start time, and a booking that starts in the past is refused. \[room-booking-prd.md · Product Decisions\]

## Decisions

- A booking's start and end are on the same date, and the end is after the start. \[room-booking-prd.md · Product Decisions\] 
- Clash, capacity, past-start and two-booking limit rules are those in Product-wide. \[room-booking-prd.md · Product Decisions\]
- A booking is made in one step from a chosen room; there is no pending or confirmation state.
- Attendee count is a whole number of at least 1.

## Out of Scope

- Editing a booking in place; a change is a cancellation and a new booking. \[room-booking-prd.md · Out of Scope\]
- Recurring bookings, invitations and calendar integration. \[room-booking-prd.md · Out of Scope\]

