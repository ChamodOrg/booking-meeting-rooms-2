import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./generated/room-booking-api";
import { authorizationHeader, classifyResponse, ForbiddenError } from "./authz/client";

// Authorization is src/authz/client.ts's alone: attach the bearer, apply the
// 401 rule. Nothing about it is decided here.
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const header = await authorizationHeader();
    if (header) request.headers.set("Authorization", header);
    return request;
  },
  async onResponse({ response }) {
    if ((await classifyResponse(response.status)) === "forbidden") {
      throw new ForbiddenError(response.status);
    }
    return response;
  },
};

// Same-origin: nginx strips /api and proxies to room-booking-api via the gateway.
export const roomBookingApi = createClient<paths>({ baseUrl: "/api" });
roomBookingApi.use(authMiddleware);
