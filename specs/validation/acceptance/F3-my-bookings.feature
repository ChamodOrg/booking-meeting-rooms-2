Feature: F3 My bookings

  @story-F3.1
  Rule: A Member sees only the bookings they made, upcoming first, soonest at the top

    Scenario: Order and ownership
      Given Asha holds an upcoming booking of Borealis on a day no one else has booked from "14:00" to "15:00"
      And she holds an upcoming booking of Atlas the day before from "09:00" to "10:00"
      And Ravi holds an upcoming booking of Cedar
      When Asha opens her bookings
      Then the first booking listed is Atlas, then Borealis
      And no booking of Cedar is listed

    Scenario: A Member with no bookings
      Given Asha holds no bookings
      When she opens her bookings
      Then the page says she has no bookings yet

  @story-F3.2
  Rule: A new booking appears in the list immediately, without a reload

    Scenario: Booking then looking at the list
      Given Asha holds no upcoming bookings
      When Asha books Delta on a day no one else has booked from "13:00" to "14:00" for 2 attendees
      Then her bookings list shows Delta from "13:00" to "14:00" on that day
      And she did not reload the page

  @story-F3.3
  Rule: A Member cancels a booking they made, which removes it and frees the room

    Scenario: Cancelling an upcoming booking
      Given Asha holds an upcoming booking of Delta on a day no one else has booked from "13:00" to "14:00"
      When Asha cancels that booking
      Then it is no longer in her bookings
      And Delta is free on that day

    @negative
    Scenario: A booking that has already started cannot be cancelled
      Given Asha holds a booking of Atlas that started yesterday
      When Asha opens her bookings
      Then that booking is listed after her upcoming ones
      And no way to cancel it is offered

  @story-F3.4
  Rule: Only the Member who made a booking may cancel it

    @negative
    Scenario: Another Member's booking cannot be cancelled
      Given Ravi holds an upcoming booking of Cedar on a day no one else has booked
      When Asha tries to cancel Ravi's booking
      Then Ravi's booking of Cedar still exists
      And Cedar is still busy on that day
