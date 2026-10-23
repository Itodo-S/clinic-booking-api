import { Hono } from "hono";

// Only what the web page needs. /reset is deliberately not reachable from the browser.
const ROUTES = [
  ["GET", "/slots"],
  ["GET", "/bookings"],
  ["POST", "/bookings"],
  ["GET", "/bookings/:id"],
  ["DELETE", "/bookings/:id"],
] as const;

/**
 * Backend-for-frontend for the web page: /web-api/* is forwarded to /api/* with the API key
 * added on the server, so the key never ships to the browser.
 */
export function webProxy(fetchApi: (request: Request) => Response | Promise<Response>) {
  const proxy = new Hono();
  for (const [method, path] of ROUTES) {
    proxy.on(method, path, (c) => {
      const url = new URL(c.req.url);
      url.pathname = url.pathname.replace(/^\/web-api/, "/api");
      const request = new Request(url, c.req.raw);
      request.headers.set("X-API-Key", process.env.API_KEY ?? "");
      return fetchApi(request);
    });
  }
  return proxy;
}
