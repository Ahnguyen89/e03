interface AvailabilityResponse {
  available: boolean;
  reason?: string | null;
}

interface ReservationResponse {
  reservationId: string;
}

interface BookingSchedulePayload {
  bookingId: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
}

const scheduleServiceUrl = process.env.SCHEDULE_SERVICE_URL ?? "http://schedule-service:5000";

export async function checkAvailability(payload: Omit<BookingSchedulePayload, "bookingId">): Promise<AvailabilityResponse> {
  const query = new URLSearchParams({
    roomId: payload.roomId,
    date: payload.date,
    startTime: payload.startTime,
    endTime: payload.endTime
  });

  const response = await fetch(`${scheduleServiceUrl}/schedules/availability?${query.toString()}`);

  if (!response.ok) {
    throw new Error(`schedule-service availability returned status ${response.status}`);
  }

  return (await response.json()) as AvailabilityResponse;
}

export async function createReservation(payload: BookingSchedulePayload): Promise<ReservationResponse> {
  const response = await fetch(`${scheduleServiceUrl}/schedules/reservations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (response.status === 409) {
    const conflictBody = (await response.json()) as { message?: string };
    const reason = conflictBody.message ?? "Reservation conflict";
    throw new Error(`CONFLICT:${reason}`);
  }

  if (!response.ok) {
    throw new Error(`schedule-service reservation returned status ${response.status}`);
  }

  return (await response.json()) as ReservationResponse;
}

export async function releaseReservation(reservationId: string): Promise<void> {
  const response = await fetch(
    `${scheduleServiceUrl}/schedules/reservations/${encodeURIComponent(reservationId)}`,
    {
      method: "DELETE"
    }
  );

  if (response.status === 404 || response.status === 409) {
    const body = (await response.json()) as { message?: string };
    throw new Error(`RELEASE_FAILED:${body.message ?? "Reservation could not be released"}`);
  }

  if (!response.ok) {
    throw new Error(`schedule-service release returned status ${response.status}`);
  }
}
