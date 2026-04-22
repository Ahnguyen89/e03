import { randomUUID } from "crypto";

import { pool } from "../db";
import { CreateReservationPayload, Reservation, ScheduleSlotInput } from "../models/reservation";

class ReservationRepository {
  async hasConflict(slot: ScheduleSlotInput): Promise<boolean> {
    const result = await pool.query(
      `
        SELECT 1 FROM reservations
        WHERE status = 'RESERVED'
          AND room_id = $1
          AND date = $2
          AND start_time < $4
          AND $3 < end_time
        LIMIT 1
      `,
      [slot.roomId, slot.date, slot.startTime, slot.endTime]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async create(payload: CreateReservationPayload): Promise<Reservation> {
    const result = await pool.query(
      `
        INSERT INTO reservations (
          reservation_id, booking_id, room_id, date, start_time, end_time, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'RESERVED', $7)
        RETURNING *
      `,
      [
        randomUUID(),
        payload.bookingId,
        payload.roomId,
        payload.date,
        payload.startTime,
        payload.endTime,
        new Date().toISOString()
      ]
    );

    return mapReservation(result.rows[0]);
  }

  async findById(reservationId: string): Promise<Reservation | undefined> {
    const result = await pool.query("SELECT * FROM reservations WHERE reservation_id = $1", [
      reservationId
    ]);
    return result.rows[0] ? mapReservation(result.rows[0]) : undefined;
  }

  async release(reservationId: string): Promise<Reservation | undefined> {
    const result = await pool.query(
      `
        UPDATE reservations
        SET status = 'RELEASED'
        WHERE reservation_id = $1
        RETURNING *
      `,
      [reservationId]
    );

    return result.rows[0] ? mapReservation(result.rows[0]) : undefined;
  }
}

function mapReservation(row: Record<string, unknown>): Reservation {
  return {
    reservationId: String(row.reservation_id),
    bookingId: String(row.booking_id),
    roomId: String(row.room_id),
    date: String(row.date),
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    status: row.status as Reservation["status"],
    createdAt: String(row.created_at)
  };
}

export const reservationRepository = new ReservationRepository();
