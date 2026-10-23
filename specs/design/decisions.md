# Technical decisions

- \[architecture\] One service owns rooms and bookings, backed by one dedicated PostgreSQL database; the web app calls it directly. *assumed* (all)
- \[data-model\] Dates and times are stored as an office-local date and wall-clock times, with no time zone. *assumed* (all)
- \[room-booking-api\] The office's rooms are seeded when the service first starts; the API has no way to change them. *assumed* (F1)
- \[room-booking-api\] The service judges "in the past" against its own local clock, which is the office's local time. *assumed* (F2)
- \[room-booking-api\] Clash and limit checks and the insert run in one transaction on the room's rows, so two simultaneous bookings cannot both succeed. *assumed* (F2)
- \[security\] Rooms are read through /rooms and a Member's bookings through /me/bookings, so another Member's booking is a 404 on cancel, never a 403. *assumed* (F1, F3)
- \[room-booking-api\] A room's busy times list only start and end, never who booked them. *assumed* (F1)
- \[room-booking-api\] Lists return 20 items per page by default and at most 100. *assumed* (F1, F3)