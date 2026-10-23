# Browse and search rooms

## Purpose

A Member sees the meeting rooms with their capacity and location, and searches for rooms free for a date and time range that hold at least their group size.

## User Stories

- F1.1 As a Member, I see the list of meeting rooms with their name, capacity and location, so I can choose one that fits my group. \[room-booking-prd.md · User Stories 2\]
- F1.2 As a Member, I search by date, start and end time and group size, and see only the rooms free for that whole range that hold at least that many people. \[room-booking-prd.md · User Stories 3\]
- F1.3 As a Member, I see any room's busy times for a day, so I know when it is taken. \[room-booking-prd.md · Actors\]

## Decisions

- A search offers no past start time, and its range is on a single day. \[room-booking-prd.md · Product Decisions\]
- A search that finds no room says so, rather than showing an empty list.
- Rooms are listed alphabetically by name.

