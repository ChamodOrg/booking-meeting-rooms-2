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
    {id: "atlas", name: "Atlas", capacity: 4, location: "Floor 1, East wing"},
    {id: "borealis", name: "Borealis", capacity: 6, location: "Floor 1, West wing"},
    {id: "cedar", name: "Cedar", capacity: 8, location: "Floor 2, East wing"},
    {id: "delta", name: "Delta", capacity: 10, location: "Floor 2, West wing"},
    {id: "everest", name: "Everest", capacity: 14, location: "Floor 3, North wing"},
    {id: "fjord", name: "Fjord", capacity: 20, location: "Floor 3, Boardroom"}
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

// Idempotent: a room whose name (or id) already exists is left untouched.
function seedRoomRows(postgresql:Client db) returns error? {
    foreach RoomSeed room in seedRooms {
        sql:ParameterizedQuery insertRoom = `
            INSERT INTO rooms (id, name, capacity, location)
            VALUES (${room.id}, ${room.name}, ${room.capacity}, ${room.location})
            ON CONFLICT DO NOTHING`;
        _ = check db->execute(insertRoom);
    }
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
