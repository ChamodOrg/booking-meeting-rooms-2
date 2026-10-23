# My bookings

## Purpose

A Member sees the bookings they made, sees a new one appear immediately, and cancels their own to release the room; cancelling someone else's is prevented.

Needs: F2.

## User Stories

- F3.1 As a Member, I see a list of the bookings I made, with room, date and times. \[room-booking-prd.md · Solution\]
- F3.2 As a Member, I see my new booking appear in my list immediately after I make it, without reloading the page. \[room-booking-prd.md · User Stories 7\]
- F3.3 As a Member, I cancel a booking I made, so the room is released for someone else. \[room-booking-prd.md · User Stories 8\]
- F3.4 As a Member, I am prevented from cancelling a booking somebody else made. \[room-booking-prd.md · User Stories 9\]

## Decisions

- Cancelling removes the booking; there is no cancellation history. \[room-booking-prd.md · Product Decisions\]
- Cancelling frees the room for that time range immediately, and a cancelled future booking no longer counts toward the two-booking limit. \[room-booking-prd.md · Product Decisions\]
- My list shows upcoming bookings first, soonest at the top.
- Bookings that have already started stay in the list after the upcoming ones, and cannot be cancelled.

## Out of Scope

- Editing a booking in place; a change is a cancellation and a new booking. \[room-booking-prd.md · Out of Scope\]

