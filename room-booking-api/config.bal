import ballerina/os;

// Raw values from the platform-injected environment; empty means unset.
configurable string bookingDbHost = os:getEnv("BOOKING_DB_HOST");
configurable string bookingDbPort = os:getEnv("BOOKING_DB_PORT");
configurable string bookingDbUser = os:getEnv("BOOKING_DB_USER");
configurable string bookingDbPassword = os:getEnv("BOOKING_DB_PASSWORD");
configurable string bookingDbName = os:getEnv("BOOKING_DB_DBNAME");
