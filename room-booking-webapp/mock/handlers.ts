// Mock handlers for room-booking-api. The foundation item holds none: each
// feature item (F1-F3) adds the handlers for the operations its screens call.
// State kept here lives in the page and resets on a full page load.
import type { RequestHandler } from "msw";

export const handlers: RequestHandler[] = [];
