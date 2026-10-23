# Domain model

The office's rooms are a fixed, seeded set; Members book them for a single day. A Member is the signed-in person, known to the app only by their identity subject.

```mermaid
erDiagram
    ROOM ||--o{ BOOKING : "is booked in"
    ROOM {
        string id PK
        string name "unique across the office"
        int capacity "whole number of people"
        string location
    }
    BOOKING {
        string id PK
        string roomId FK
        string memberId "identity subject of the booker"
        date date "single day, office local time"
        time startTime
        time endTime "after startTime, same date"
        int attendees "at least 1, at most room capacity"
    }
```

- A booking belongs to the Member who made it (`memberId`); only that Member may cancel it. Cancelling deletes the row.
- Two bookings of one room clash when their time ranges overlap; touching ranges do not.