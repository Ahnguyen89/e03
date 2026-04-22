export type ReservationStatus = "RESERVED" | "RELEASED";

export interface Reservation {
  reservationId: string;
  bookingId: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  createdAt: string;
}

export interface ScheduleSlotInput {
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface CreateReservationPayload extends ScheduleSlotInput {
  bookingId: string;
}
