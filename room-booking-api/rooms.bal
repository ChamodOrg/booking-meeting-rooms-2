import ballerina/http;
import ballerina/log;
import ballerina/sql;
import ballerina/time;

type BusyRow record {|
    string startText;
    string endText;
|};

type BookedRow record {|
    string roomId;
    string startText;
    string endText;
|};

type SearchWindow record {|
    time:Date date;
    MinuteRange range;
|};

function badRequest(string message) returns ErrorBadRequest {
    return {body: {code: 400, message: "Bad request", description: message}};
}

function notFoundRoom() returns ErrorNotFound {
    return {body: {code: 404, message: "Not found", description: "No such room"}};
}

function pageLinks(string path, string extraQuery, int offset, int 'limit, int count) returns [string?, string?] {
    string base = path + "?" + extraQuery + "limit=" + 'limit.toString() + "&offset=";
    string? next = offset + 'limit < count ? base + (offset + 'limit).toString() : ();
    string? previous = offset > 0 ? base + (offset - 'limit > 0 ? offset - 'limit : 0).toString() : ();
    return [next, previous];
}

function paging(int 'limit, int offset) returns ErrorBadRequest? {
    if 'limit < 1 || 'limit > 100 {
        return badRequest("limit must be between 1 and 100");
    }
    if offset < 0 {
        return badRequest("offset must not be negative");
    }
    return ();
}

function slice(int count, int 'limit, int offset) returns [int, int] {
    int first = offset < count ? offset : count;
    int last = first + 'limit < count ? first + 'limit : count;
    return [first, last];
}

// A search needs date, startTime and endTime together; none of them means "list all".
function parseWindow(string? date, string? startTime, string? endTime) returns SearchWindow|ErrorBadRequest|() {
    if date is () && startTime is () && endTime is () {
        return ();
    }
    if date is () || startTime is () || endTime is () {
        return badRequest("date, startTime and endTime must be given together");
    }
    time:Date? day = parseDate(date);
    if day is () {
        return badRequest("date must be a real date as YYYY-MM-DD");
    }
    int? startMinute = parseMinutes(startTime);
    int? endMinute = parseMinutes(endTime);
    if startMinute is () || endMinute is () {
        return badRequest("startTime and endTime must be HH:MM on the same day");
    }
    if endMinute <= startMinute {
        return badRequest("endTime must be after startTime on the same day");
    }
    if startIsPast(day, startMinute) {
        return badRequest("startTime is in the past");
    }
    return {date: day, range: {startMinute, endMinute}};
}

function loadRooms(int minCapacity) returns Room[]|error {
    stream<Room, sql:Error?> rows = bookingDb->query(`
        SELECT id, name, capacity, location FROM rooms
        WHERE capacity >= ${minCapacity} ORDER BY name ASC`);
    return from Room room in rows select room;
}

function loadBookedRows(time:Date day) returns BookedRow[]|error {
    string dayText = formatDate(day);
    stream<BookedRow, sql:Error?> rows = bookingDb->query(`
        SELECT room_id AS "roomId", to_char(start_time, 'HH24:MI') AS "startText",
               to_char(end_time, 'HH24:MI') AS "endText"
        FROM bookings WHERE booking_date = ${dayText}::date`);
    return from BookedRow row in rows select row;
}

function searchRooms(int minCapacity, SearchWindow? window) returns Room[]|error {
    Room[] rooms = check loadRooms(minCapacity);
    if window is () {
        return rooms;
    }
    BookedRow[] booked = check loadBookedRows(window.date);
    Room[] free = [];
    foreach Room room in rooms {
        MinuteRange[] existing = [];
        foreach BookedRow row in booked {
            int? rowStart = parseMinutes(row.startText);
            int? rowEnd = parseMinutes(row.endText);
            if row.roomId == room.id && rowStart is int && rowEnd is int {
                existing.push({startMinute: rowStart, endMinute: rowEnd});
            }
        }
        if !clashesWithAny(window.range, existing) {
            free.push(room);
        }
    }
    return free;
}

function findRoom(string roomId) returns Room|sql:NoRowsError|error {
    return bookingDb->queryRow(`SELECT id, name, capacity, location FROM rooms WHERE id = ${roomId}`);
}

function busyRanges(string roomId, time:Date day) returns BusyTime[]|error {
    string dayText = formatDate(day);
    stream<BusyRow, sql:Error?> rows = bookingDb->query(`
        SELECT to_char(start_time, 'HH24:MI') AS "startText", to_char(end_time, 'HH24:MI') AS "endText"
        FROM bookings WHERE room_id = ${roomId} AND booking_date = ${dayText}::date
        ORDER BY start_time ASC, end_time ASC`);
    return from BusyRow row in rows select {date: dayText, startTime: row.startText, endTime: row.endText};
}

function listRoomsHandler(string? date, string? startTime, string? endTime, int? minCapacity, int 'limit, int offset)
        returns inline_response_200|ErrorBadRequest|http:InternalServerError {
    ErrorBadRequest? pageError = paging('limit, offset);
    if pageError is ErrorBadRequest {
        return pageError;
    }
    int capacity = 1;
    if minCapacity is int {
        if minCapacity < 1 {
            return badRequest("minCapacity must be at least 1");
        }
        capacity = minCapacity;
    }
    SearchWindow|ErrorBadRequest|() window = parseWindow(date, startTime, endTime);
    if window is ErrorBadRequest {
        return window;
    }
    Room[]|error rooms = searchRooms(capacity, window);
    if rooms is error {
        log:printError("listRooms failed", 'error = rooms);
        return http:INTERNAL_SERVER_ERROR;
    }
    int count = rooms.length();
    [int, int] [firstIndex, lastIndex] = slice(count, 'limit, offset);
    string extra = "";
    if date is string && startTime is string && endTime is string {
        extra = "date=" + date + "&startTime=" + startTime + "&endTime=" + endTime + "&";
    }
    if minCapacity is int {
        extra += "minCapacity=" + minCapacity.toString() + "&";
    }
    [string?, string?] [next, previous] = pageLinks("/rooms", extra, offset, 'limit, count);
    return {count, next, previous, data: rooms.slice(firstIndex, lastIndex)};
}

function getRoomHandler(string roomId) returns Room|ErrorNotFound|http:InternalServerError {
    Room|sql:NoRowsError|error room = findRoom(roomId);
    if room is sql:NoRowsError {
        return notFoundRoom();
    }
    if room is error {
        log:printError("getRoom failed", 'error = room);
        return http:INTERNAL_SERVER_ERROR;
    }
    return room;
}

function busyTimesHandler(string roomId, string date, int 'limit, int offset)
        returns inline_response_200_1|ErrorBadRequest|ErrorNotFound|http:InternalServerError {
    ErrorBadRequest? pageError = paging('limit, offset);
    if pageError is ErrorBadRequest {
        return pageError;
    }
    time:Date? day = parseDate(date);
    if day is () {
        return badRequest("date must be a real date as YYYY-MM-DD");
    }
    Room|sql:NoRowsError|error room = findRoom(roomId);
    if room is sql:NoRowsError {
        return notFoundRoom();
    }
    if room is error {
        log:printError("listRoomBusyTimes failed", 'error = room);
        return http:INTERNAL_SERVER_ERROR;
    }
    BusyTime[]|error ranges = busyRanges(roomId, day);
    if ranges is error {
        log:printError("listRoomBusyTimes failed", 'error = ranges);
        return http:INTERNAL_SERVER_ERROR;
    }
    int count = ranges.length();
    [int, int] [firstIndex, lastIndex] = slice(count, 'limit, offset);
    [string?, string?] [next, previous] = pageLinks("/rooms/" + roomId + "/busy-times", "date=" + date + "&", offset, 'limit, count);
    return {count, next, previous, data: ranges.slice(firstIndex, lastIndex)};
}
