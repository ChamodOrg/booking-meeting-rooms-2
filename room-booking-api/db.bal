import ballerina/log;
import ballerina/sql;
import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

type DbSettings record {|
    string host;
    int port;
    string user;
    string password;
    string name;
|};

type RoomSeed record {|
    string id;
    string name;
    int capacity;
    string location;
|};

// The office's fixed rooms; names are unique, capacity is a whole number of people.
final readonly & RoomSeed[] seedRooms = [
    {id: "atlas", name: "Atlas", capacity: 4, location: "Floor 1, east wing"},
    {id: "borealis", name: "Borealis", capacity: 6, location: "Floor 1, west wing"},
    {id: "cedar", name: "Cedar", capacity: 10, location: "Floor 2, east wing"},
    {id: "delta", name: "Delta", capacity: 2, location: "Floor 2, phone nook"},
    {id: "everest", name: "Everest", capacity: 16, location: "Floor 3, boardroom"}
];

function orDefault(string value, string fallback) returns string {
    return value == "" ? fallback : value;
}

function loadDbSettings() returns DbSettings|error {
    string portText = orDefault(bookingDbPort, "5432");
    int portNumber = check int:fromString(portText);
    return {
        host: orDefault(bookingDbHost, "localhost"),
        port: portNumber,
        user: orDefault(bookingDbUser, "postgres"),
        password: orDefault(bookingDbPassword, "postgres"),
        name: orDefault(bookingDbName, "booking")
    };
}

function newDbClient() returns postgresql:Client|error {
    DbSettings settings = check loadDbSettings();
    return new (settings.host, settings.user, settings.password, settings.name, settings.port);
}

// All times are naive office-local values: DATE and TIME columns, no time zones.
function createSchema(postgresql:Client db) returns error? {
    _ = check db->execute(`
        CREATE TABLE IF NOT EXISTS rooms (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            capacity INTEGER NOT NULL CHECK (capacity >= 1),
            location TEXT NOT NULL
        )`);
    _ = check db->execute(`
        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL REFERENCES rooms (id),
            member_id TEXT NOT NULL,
            booking_date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            attendees INTEGER NOT NULL CHECK (attendees >= 1),
            CHECK (end_time > start_time)
        )`);
    _ = check db->execute(`
        CREATE INDEX IF NOT EXISTS bookings_room_date_idx ON bookings (room_id, booking_date)`);
    _ = check db->execute(`
        CREATE INDEX IF NOT EXISTS bookings_member_idx ON bookings (member_id)`);
}

// Idempotent: the rooms table is brought in line with the seed. An id already present is
// updated, and a room no longer in the seed is removed together with its bookings.
function seedRoomRows(postgresql:Client db) returns error? {
    foreach RoomSeed room in seedRooms {
        sql:ParameterizedQuery insertRoom = `
            INSERT INTO rooms (id, name, capacity, location)
            VALUES (${room.id}, ${room.name}, ${room.capacity}, ${room.location})
            ON CONFLICT (id) DO UPDATE
            SET name = EXCLUDED.name, capacity = EXCLUDED.capacity, location = EXCLUDED.location`;
        _ = check db->execute(insertRoom);
    }
    string[] keepIds = from RoomSeed room in seedRooms select room.id;
    foreach string staleId in check staleRoomIds(db, keepIds) {
        _ = check db->execute(`DELETE FROM bookings WHERE room_id = ${staleId}`);
        _ = check db->execute(`DELETE FROM rooms WHERE id = ${staleId}`);
    }
}

type RoomIdRow record {|
    string id;
|};

function staleRoomIds(postgresql:Client db, string[] keepIds) returns string[]|error {
    stream<RoomIdRow, sql:Error?> rows = db->query(`SELECT id FROM rooms`);
    RoomIdRow[] all = check from RoomIdRow row in rows select row;
    return from RoomIdRow row in all
        where keepIds.indexOf(row.id) is ()
        select row.id;
}

function initDb() returns postgresql:Client|error {
    postgresql:Client db = check newDbClient();
    check createSchema(db);
    check seedRoomRows(db);
    log:printInfo("booking database ready", rooms = seedRooms.length());
    return db;
}

// Runs before any listener starts; a failure here stops the service.
final postgresql:Client bookingDb = check initDb();
