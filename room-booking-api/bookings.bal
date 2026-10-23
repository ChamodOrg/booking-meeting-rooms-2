import ballerina/http;
import ballerina/log;
import ballerina/sql;
import ballerina/time;
import ballerina/uuid;

type BookingOutcome Booking|ErrorBadRequest|ErrorNotFound|ErrorConflict;

type ExistingBooking record {|
    string startText;
    string endText;
|};

type CountRow record {|
    int total;
|};

function conflictError(string message) returns ErrorConflict {
    return {body: {code: 409, message: "Conflict", description: message}};
}

// Request checks that need no database: same-day range, past start, attendee floor.
function validateBooking(BookingRequest request) returns [time:Date, MinuteRange]|ErrorBadRequest {
    if request.attendees < 1 {
        return badRequest("attendees must be a whole number of at least 1");
    }
    time:Date? day = parseDate(request.date);
    if day is () {
        return badRequest("date must be a real date as YYYY-MM-DD");
    }
    int? startMinute = parseMinutes(request.startTime);
    int? endMinute = parseMinutes(request.endTime);
    if startMinute is () || endMinute is () {
        return badRequest("startTime and endTime must be HH:MM on the same day");
    }
    if endMinute <= startMinute {
        return badRequest("endTime must be after startTime on the same day");
    }
    if startIsPast(day, startMinute) {
        return badRequest("The start time has passed; choose a start time that is not in the past");
    }
    return [day, {startMinute, endMinute}];
}

// Runs inside the booking transaction: the room row and the caller are locked first,
// so two concurrent requests for the same room or the same Member are serialised.
function decideBooking(string memberId, BookingRequest request, time:Date day, MinuteRange range)
        returns BookingOutcome|error {
    Room|sql:Error room = bookingDb->queryRow(`
        SELECT id, name, capacity, location FROM rooms WHERE id = ${request.roomId} FOR UPDATE`);
    if room is sql:NoRowsError {
        return notFoundRoom();
    }
    if room is error {
        return room;
    }
    string? _ = check bookingDb->queryRow(`SELECT pg_advisory_xact_lock(hashtext(${memberId}))`);

    if !fitsCapacity(request.attendees, room.capacity) {
        return badRequest(string `${room.name} holds ${room.capacity} people; ${request.attendees} attendees is too many`);
    }

    string dayText = formatDate(day);
    stream<ExistingBooking, sql:Error?> rows = bookingDb->query(`
        SELECT to_char(start_time, 'HH24:MI') AS "startText", to_char(end_time, 'HH24:MI') AS "endText"
        FROM bookings WHERE room_id = ${room.id} AND booking_date = ${dayText}::date`);
    ExistingBooking[] existing = check from ExistingBooking row in rows select row;
    foreach ExistingBooking row in existing {
        int? rowStart = parseMinutes(row.startText);
        int? rowEnd = parseMinutes(row.endText);
        if rowStart is int && rowEnd is int && clashesWithAny(range, [{startMinute: rowStart, endMinute: rowEnd}]) {
            return conflictError(string `${room.name} is already booked from ${row.startText} to ${row.endText} on ${dayText}`);
        }
    }

    [time:Date, int] [today, nowMinute] = officeNow();
    string todayText = formatDate(today);
    string nowText = formatMinutes(nowMinute);
    CountRow held = check bookingDb->queryRow(`
        SELECT COUNT(*) AS total FROM bookings
        WHERE member_id = ${memberId}
          AND (booking_date > ${todayText}::date
               OR (booking_date = ${todayText}::date AND start_time >= ${nowText}::time))`);
    if held.total >= 2 {
        return conflictError("You already hold two upcoming bookings; cancel one before booking another");
    }

    string id = uuid:createType4AsString();
    string startText = formatMinutes(range.startMinute);
    string endText = formatMinutes(range.endMinute);
    _ = check bookingDb->execute(`
        INSERT INTO bookings (id, room_id, member_id, booking_date, start_time, end_time, attendees)
        VALUES (${id}, ${room.id}, ${memberId}, ${dayText}::date, ${startText}::time, ${endText}::time,
                ${request.attendees})`);
    return {
        id,
        roomId: room.id,
        roomName: room.name,
        date: dayText,
        startTime: startText,
        endTime: endText,
        attendees: request.attendees,
        status: "upcoming"
    };
}

function createBookingHandler(string memberId, BookingRequest request) returns BookingOutcome|http:InternalServerError {
    [time:Date, MinuteRange]|ErrorBadRequest valid = validateBooking(request);
    if valid is ErrorBadRequest {
        return valid;
    }
    var [day, range] = valid;
    BookingOutcome|error result = trap runBookingTransaction(memberId, request, day, range);
    if result is error {
        log:printError("createMyBooking failed", 'error = result);
        return http:INTERNAL_SERVER_ERROR;
    }
    return result;
}

function runBookingTransaction(string memberId, BookingRequest request, time:Date day, MinuteRange range)
        returns BookingOutcome|error {
    BookingOutcome|error outcome = notFoundRoom();
    transaction {
        outcome = decideBooking(memberId, request, day, range);
        if outcome is Booking {
            check commit;
        } else {
            rollback;
        }
    } on fail error e {
        return e;
    }
    return outcome;
}

type BookingRow record {|
    string id;
    string roomId;
    string roomName;
    string dateText;
    string startText;
    string endText;
    int attendees;
    boolean upcoming;
|};

function notFoundBooking() returns ErrorNotFound {
    return {body: {code: 404, message: "Not found", description: "No such booking"}};
}

// A booking is upcoming while its start is not before the office-local now: the same
// cut-off createMyBooking uses for the two-booking limit.
function listMyBookings(string memberId, int 'limit, int offset) returns [BookingRow[], int]|error {
    [time:Date, int] [today, nowMinute] = officeNow();
    string todayText = formatDate(today);
    string nowText = formatMinutes(nowMinute);
    CountRow total = check bookingDb->queryRow(`
        SELECT COUNT(*) AS total FROM bookings WHERE member_id = ${memberId}`);
    stream<BookingRow, sql:Error?> rows = bookingDb->query(`
        SELECT id, "roomId", "roomName", "dateText", "startText", "endText", attendees, upcoming FROM (
            SELECT b.id AS id, b.room_id AS "roomId", r.name AS "roomName",
                   to_char(b.booking_date, 'YYYY-MM-DD') AS "dateText",
                   to_char(b.start_time, 'HH24:MI') AS "startText",
                   to_char(b.end_time, 'HH24:MI') AS "endText",
                   b.attendees AS attendees,
                   (b.booking_date > ${todayText}::date
                    OR (b.booking_date = ${todayText}::date AND b.start_time >= ${nowText}::time)) AS upcoming,
                   (b.booking_date + b.start_time) AS starts_at
            FROM bookings b JOIN rooms r ON r.id = b.room_id
            WHERE b.member_id = ${memberId}) AS mine
        ORDER BY upcoming DESC,
                 CASE WHEN upcoming THEN starts_at END ASC,
                 starts_at DESC, id ASC
        LIMIT ${'limit} OFFSET ${offset}`);
    BookingRow[] page = check from BookingRow row in rows select row;
    return [page, total.total];
}

function listBookingsHandler(string memberId, int 'limit, int offset)
        returns inline_response_200_2|ErrorBadRequest|http:InternalServerError {
    ErrorBadRequest? invalid = paging('limit, offset);
    if invalid is ErrorBadRequest {
        return invalid;
    }
    [BookingRow[], int]|error result = trap listMyBookings(memberId, 'limit, offset);
    if result is error {
        log:printError("listMyBookings failed", 'error = result);
        return http:INTERNAL_SERVER_ERROR;
    }
    var [rows, count] = result;
    Booking[] data = from BookingRow row in rows
        select {
            id: row.id,
            roomId: row.roomId,
            roomName: row.roomName,
            date: row.dateText,
            startTime: row.startText,
            endTime: row.endText,
            attendees: row.attendees,
            status: row.upcoming ? "upcoming" : "past"
        };
    [string?, string?] [next, previous] = pageLinks("/me/bookings", "", offset, 'limit, count);
    return {count, next, previous, data};
}

// One statement deletes only an upcoming booking of this member, so a start that
// passes between check and delete cannot slip through. A miss is then told apart:
// the member's own started booking is 409; anything else is 404.
function cancelMyBooking(string memberId, string bookingId) returns http:NoContent|ErrorNotFound|ErrorConflict|error {
    [time:Date, int] [today, nowMinute] = officeNow();
    string todayText = formatDate(today);
    string nowText = formatMinutes(nowMinute);
    sql:ExecutionResult result = check bookingDb->execute(`
        DELETE FROM bookings
        WHERE id = ${bookingId} AND member_id = ${memberId}
          AND (booking_date > ${todayText}::date
               OR (booking_date = ${todayText}::date AND start_time >= ${nowText}::time))`);
    if result.affectedRowCount == 1 {
        return http:NO_CONTENT;
    }
    CountRow owned = check bookingDb->queryRow(`
        SELECT COUNT(*) AS total FROM bookings WHERE id = ${bookingId} AND member_id = ${memberId}`);
    if owned.total > 0 {
        return conflictError("This booking has already started and cannot be cancelled");
    }
    return notFoundBooking();
}

function cancelBookingHandler(string memberId, string bookingId)
        returns http:NoContent|ErrorNotFound|ErrorConflict|http:InternalServerError {
    http:NoContent|ErrorNotFound|ErrorConflict|error result = trap cancelMyBooking(memberId, bookingId);
    if result is error {
        log:printError("cancelMyBooking failed", 'error = result);
        return http:INTERNAL_SERVER_ERROR;
    }
    return result;
}
