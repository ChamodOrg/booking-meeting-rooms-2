Feature: F2 Book a room

  @story-F2.1
  Rule: A Member books a room for a date, start and end time and attendee count

    Scenario: A valid booking
      Given Asha holds no upcoming bookings
      And Borealis is free on a day no one else has booked
      When Asha books Borealis on that day from "13:00" to "14:00" for 5 attendees
      Then the booking is made
      And Borealis is shown busy from "13:00" to "14:00" on that day

  @story-F2.2
  Rule: A booking that overlaps an existing booking of the same room is refused

    @negative
    Scenario: A partial overlap is refused with a reason
      Given Ravi has booked Cedar from "09:00" to "10:30" on a day no one else has booked
      When Asha tries to book Cedar on that day from "10:00" to "11:00" for 4 attendees
      Then the booking is refused because Cedar is already booked from "09:00" to "10:30"
      And Cedar is still busy only from "09:00" to "10:30" on that day

    Scenario: A booking that only touches an existing one is allowed
      Given Ravi has booked Cedar from "09:00" to "10:30" on a day no one else has booked
      When Asha books Cedar on that day from "10:30" to "11:30" for 4 attendees
      Then the booking is made

  @story-F2.3
  Rule: A booking for more attendees than the room holds is refused

    @negative
    Scenario: One attendee too many
      Given Asha holds no upcoming bookings
      When Asha tries to book Atlas on a day no one has booked from "13:00" to "14:00" for 5 attendees
      Then the booking is refused because Atlas holds 4 people
      And Atlas has no booking on that day

    Scenario: Exactly the room's capacity is allowed
      Given Asha holds no upcoming bookings
      When Asha books Atlas on a day no one has booked from "13:00" to "14:00" for 4 attendees
      Then the booking is made

  @story-F2.4
  Rule: A Member may hold at most two upcoming bookings

    @negative
    Scenario: A third upcoming booking is refused
      Given Asha holds two upcoming bookings
      When Asha tries to book Delta on a day no one has booked from "13:00" to "14:00" for 2 attendees
      Then the booking is refused because she already holds two upcoming bookings
      And Asha still holds exactly two upcoming bookings

    Scenario: Cancelling one makes room for another
      Given Asha holds two upcoming bookings
      And she cancels one of them
      When Asha books Delta on a day no one has booked from "13:00" to "14:00" for 2 attendees
      Then the booking is made

  @story-F2.5
  Rule: A booking that starts in the past cannot be made

    @negative
    Scenario: A start time that has passed
      Given it is "10:00" today
      When Asha tries to book Delta today from "09:00" to "09:30" for 2 attendees
      Then the booking is refused because the start time has passed
      And Delta has no booking from "09:00" to "09:30" today

    @negative
    Scenario: A start time that has passed is not offered
      Given it is "10:00" today
      When Asha opens the booking form for today
      Then no start time before "10:00" is offered to choose

  @story-F2.1
  Rule: A booking ends after it starts, on the same day

    @negative
    Scenario: An end time before the start time
      Given Asha holds no upcoming bookings
      When Asha tries to book Delta on a day no one has booked from "14:00" to "13:00" for 2 attendees
      Then the booking is refused because the end must be after the start
      And Delta has no booking on that day
