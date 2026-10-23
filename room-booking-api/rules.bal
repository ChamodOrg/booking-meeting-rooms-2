import ballerina/time;

// Shared room-level rules (P3). Search (F1) and booking (F2) both call these,
// so the two can never disagree. Times are naive office-local minutes of the day.

// A time range inside one day, in minutes after midnight.
public type MinuteRange record {|
    int startMinute;
    int endMinute;
|};

// Two ranges overlap when each starts before the other ends; touching ranges do not.
public function rangesOverlap(MinuteRange first, MinuteRange second) returns boolean {
    return first.startMinute < second.endMinute && first.endMinute > second.startMinute;
}

// True when the requested range clashes with any of the existing ranges.
public function clashesWithAny(MinuteRange requested, MinuteRange[] existing) returns boolean {
    foreach MinuteRange other in existing {
        if rangesOverlap(requested, other) {
            return true;
        }
    }
    return false;
}

// A room holds a group when the group is at least 1 and at most its capacity.
public function fitsCapacity(int attendees, int capacity) returns boolean {
    return attendees >= 1 && attendees <= capacity;
}

// Parses "HH:MM" (00:00 to 23:59) into minutes after midnight.
public function parseMinutes(string text) returns int? {
    if !re `[0-9]{2}:[0-9]{2}`.isFullMatch(text) {
        return ();
    }
    int|error hours = int:fromString(text.substring(0, 2));
    int|error minutes = int:fromString(text.substring(3, 5));
    if hours is error || minutes is error {
        return ();
    }
    if hours > 23 || minutes > 59 {
        return ();
    }
    return hours * 60 + minutes;
}

public function formatMinutes(int minutes) returns string {
    return pad2(minutes / 60) + ":" + pad2(minutes % 60);
}

function pad2(int value) returns string {
    return value < 10 ? "0" + value.toString() : value.toString();
}

// Parses "YYYY-MM-DD" into a validated date.
public function parseDate(string text) returns time:Date? {
    if !re `[0-9]{4}-[0-9]{2}-[0-9]{2}`.isFullMatch(text) {
        return ();
    }
    int|error year = int:fromString(text.substring(0, 4));
    int|error month = int:fromString(text.substring(5, 7));
    int|error day = int:fromString(text.substring(8, 10));
    if year is error || month is error || day is error {
        return ();
    }
    time:Date date = {year, month, day};
    time:Error? invalid = time:dateValidate(date);
    if invalid is time:Error {
        return ();
    }
    return date;
}

// Current office-local date and minute of day.
public function officeNow() returns [time:Date, int] {
    time:Utc shifted = time:utcAddSeconds(time:utcNow(), <time:Seconds>officeUtcOffsetMinutes * 60);
    time:Civil civil = time:utcToCivil(shifted);
    return [{year: civil.year, month: civil.month, day: civil.day}, civil.hour * 60 + civil.minute];
}

// True when the date and start minute fall before the office-local now.
public function startIsPast(time:Date date, int startMinute) returns boolean {
    [time:Date, int] [today, nowMinute] = officeNow();
    int dateOrder = dateKey(date) - dateKey(today);
    if dateOrder != 0 {
        return dateOrder < 0;
    }
    return startMinute < nowMinute;
}

function dateKey(time:Date date) returns int {
    return date.year * 10000 + date.month * 100 + date.day;
}

public function formatDate(time:Date date) returns string {
    return string `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
}
