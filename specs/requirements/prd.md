# Shared Office Room Booking

## Problem Statement

Teams in a shared office compete for the same handful of meeting rooms. Without one place to see what is free and to claim it, people double-book, turn up to an occupied room, or book a room too small for their group. Wall calendars, chat messages and spreadsheets cannot refuse a clash, so it is discovered in the corridor.

## Solution

A web app for booking the office's meeting rooms. A signed-in Member sees the rooms and their capacity, books one for a time range, and sees their own bookings. The app refuses a booking that clashes with an existing one or exceeds the room's capacity, so a confirmed booking can be relied on.

## Actors

- **Member** — anyone in the office who signs in, sees every room and its busy times, books rooms, and manages the bookings they created. May only cancel their own bookings. There is no administrator or privileged role.

## Features

- F1 [Browse and search rooms](features/F1-browse-and-search-rooms.md)
- F2 [Book a room](features/F2-book-a-room.md)
- F3 [My bookings](features/F3-my-bookings.md)

## Product-wide

See [Product-wide](product-wide.md).

## Out of Scope

- Adding, editing or removing rooms through the app.
- Administrator or facilities-manager roles, and any privileged action.
- Recurring or repeating bookings.
- Inviting attendees, sending invitations, or any calendar integration.
- Check-in, no-show detection, or automatic release of unused rooms.
- Equipment or catering requests attached to a booking.
- Approval workflows for booking a room.
- Multiple offices, buildings, or floors as separate bookable scopes.
- Time zones and daylight-saving handling.
- Editing a booking in place; a change is a cancellation and a new booking.
- Reporting on room utilisation.