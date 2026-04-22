import { randomUUID } from "crypto";

import { CreateReservationPayload, Reservation, ScheduleSlotInput } from "../models/reservation";

function overlaps(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string
): boolean {
  return firstStart < secondEnd && secondStart < firstEnd;
}

class ReservationRepository {
  private readonly reservations = new Map<string, Reservation>();

  hasConflict(slot: ScheduleSlotInput): boolean {
    return Array.from(this.reservations.values()).some((reservation) => {
      if (reservation.status !== "RESERVED") {
        return false;
      }

      if (reservation.roomId !== slot.roomId || reservation.date !== slot.date) {
        return false;
      }

      return overlaps(
        reservation.startTime,
        reservation.endTime,
        slot.startTime,
        slot.endTime
      );
    });
  }

  create(payload: CreateReservationPayload): Reservation {
    const reservation: Reservation = {
      reservationId: randomUUID(),
      bookingId: payload.bookingId,
      roomId: payload.roomId,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      status: "RESERVED",
      createdAt: new Date().toISOString()
    };

    this.reservations.set(reservation.reservationId, reservation);
    return reservation;
  }

  findById(reservationId: string): Reservation | undefined {
    return this.reservations.get(reservationId);
  }

  release(reservationId: string): Reservation | undefined {
    const reservation = this.reservations.get(reservationId);

    if (!reservation) {
      return undefined;
    }

    const updatedReservation: Reservation = {
      ...reservation,
      status: "RELEASED"
    };

    this.reservations.set(reservationId, updatedReservation);
    return updatedReservation;
  }
}

export const reservationRepository = new ReservationRepository();
