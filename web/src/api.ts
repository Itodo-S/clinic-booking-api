export interface Slot {
  id: string;
  provider: string;
  start: string;
  end: string;
  available: boolean;
}

export interface Booking {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  status: "confirmed" | "cancelled";
  created_at: string;
}

export interface BookingPage {
  bookings: Booking[];
  next_cursor: string | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfter = 0,
  ) {
    super(message);
  }
}

// Calls go to the same-origin proxy, which adds the API key on the server.
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/web-api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new ApiError("Can't reach the clinic right now. Check your connection and try again.", 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      body.error ?? `Something went wrong (${res.status})`,
      res.status,
      Number(res.headers.get("Retry-After")) || 0,
    );
  }
  return body as T;
}

const bookingPath = (id: string) => `/bookings/${encodeURIComponent(id)}`;

export const api = {
  slots: () => request<{ slots: Slot[] }>("/slots").then((res) => res.slots),

  book: (input: { slot_id: string; name: string; email: string }, idempotencyKey: string) =>
    request<Booking>("/bookings", {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Idempotency-Key": idempotencyKey },
    }),

  booking: (id: string) => request<Booking>(bookingPath(id)),

  cancel: (id: string) => request<Booking>(bookingPath(id), { method: "DELETE" }),

  bookingsFor: (email: string, cursor?: string) =>
    request<BookingPage>(
      `/bookings?${new URLSearchParams({ email, limit: "5", ...(cursor && { cursor }) })}`,
    ),
};
