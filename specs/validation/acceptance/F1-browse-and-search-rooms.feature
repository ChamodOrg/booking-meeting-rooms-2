Feature: F1 Browse and search rooms

  @story-F1.1
  Rule: Every Member sees all the office's rooms with name, capacity and location, alphabetically

    Scenario: The room list
      Given Asha is signed in
      When she opens the rooms page
      Then the rooms are listed in the order "Atlas", "Borealis", "Cedar", "Delta", "Everest"
      And "Cedar" is shown with capacity 10 and location "Floor 2, east wing"

  @story-F1.2
  Rule: A search offers only rooms free for the whole range that hold at least the group size

    Scenario: A free room that is big enough is offered
      Given Atlas is booked from "11:00" to "12:00" on a day no one else has booked
      When Asha searches that day from "13:00" to "14:00" for a group of 4
      Then "Atlas" is among the rooms offered

    @negative
    Scenario: A room booked for part of the range is not offered
      Given Atlas is booked from "11:00" to "12:00" on a day no one else has booked
      When Asha searches that day from "11:30" to "12:30" for a group of 2
      Then "Atlas" is not among the rooms offered

    @negative
    Scenario: A room too small for the group is not offered
      Given Asha is signed in
      When she searches a free day from "13:00" to "14:00" for a group of 5
      Then "Atlas" and "Delta" are not among the rooms offered

    @negative
    Scenario: A search with no matching room says so
      Given Asha is signed in
      When she searches a free day from "13:00" to "14:00" for a group of 20
      Then no room is listed
      And the page says no room matches

    Scenario: A booking that only touches the range does not hide the room
      Given Atlas is booked from "11:00" to "12:00" on a day no one else has booked
      When Asha searches that day from "12:00" to "13:00" for a group of 2
      Then "Atlas" is among the rooms offered

  @story-F1.2
  Rule: A search never offers a past start time

    @negative
    Scenario: A start time that has passed cannot be searched
      Given it is "10:00" today
      When Asha tries to search today from "09:00" to "09:30"
      Then no past start time is offered to choose

  @story-F1.3
  Rule: Any Member sees when a room is busy on a day, but not who booked it

    Scenario: Busy times of a room
      Given Ravi has booked Atlas from "11:00" to "12:00" on a day no one else has booked
      When Asha opens Atlas and picks that day
      Then Atlas is shown busy from "11:00" to "12:00"
      And the name of the person who booked it is not shown

    Scenario: A room with nothing booked
      Given nothing is booked in Delta on a chosen day
      When Asha opens Delta and picks that day
      Then Delta is shown as free all day
