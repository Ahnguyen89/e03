import { pool } from "../db";
import { Booking, BookingFilters, CreateBookingPayload } from "../models/booking";

class BookingRepository {
  async list(filters: BookingFilters): Promise<Booking[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];

    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }

    if (filters.date) {
      values.push(filters.date);
      clauses.push(`date = $${values.length}`);
    }

    if (filters.requesterId) {
      values.push(filters.requesterId);
      clauses.push(`requester_id = $${values.length}`);
    }

    if (filters.requesterEmail) {
      values.push(filters.requesterEmail);
      clauses.push(`LOWER(requester_email) = LOWER($${values.length})`);
    }

    if (filters.roomId) {
      values.push(filters.roomId);
      clauses.push(`room_id = $${values.length}`);
    }

    const result = await pool.query(
      `
        SELECT * FROM bookings
        ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
        ORDER BY created_at DESC
      `,
      values
    );

    return result.rows.map(mapBooking);
  }

  async findById(bookingId: string): Promise<Booking | undefined> {
    const result = await pool.query("SELECT * FROM bookings WHERE booking_id = $1", [bookingId]);
    return result.rows[0] ? mapBooking(result.rows[0]) : undefined;
  }

  async create(bookingId: string, payload: CreateBookingPayload): Promise<Booking> {
    const now = new Date().toISOString();
    const result = await pool.query(
      `
        INSERT INTO bookings (
          booking_id, room_id, requester_id, requester_name, requester_email, purpose,
          attendee_count, date, start_time, end_time, purpose_detail, status,
          reviewed_by, review_note, rejection_reason, cancellation_reason, reservation_id,
          created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, 'PENDING',
          NULL, NULL, NULL, NULL, NULL,
          $12, NULL
        )
        RETURNING *
      `,
      [
        bookingId,
        payload.roomId,
        payload.requesterId,
        payload.requesterName,
        payload.requesterEmail,
        payload.purpose,
        payload.attendeeCount,
        payload.date,
        payload.startTime,
        payload.endTime,
        payload.purposeDetail,
        now
      ]
    );

    return mapBooking(result.rows[0]);
  }

  async save(booking: Booking): Promise<Booking> {
    const result = await pool.query(
      `
        UPDATE bookings
        SET room_id = $2,
            requester_id = $3,
            requester_name = $4,
            requester_email = $5,
            purpose = $6,
            attendee_count = $7,
            date = $8,
            start_time = $9,
            end_time = $10,
            purpose_detail = $11,
            status = $12,
            reviewed_by = $13,
            review_note = $14,
            rejection_reason = $15,
            cancellation_reason = $16,
            reservation_id = $17,
            created_at = $18,
            updated_at = $19
        WHERE booking_id = $1
        RETURNING *
      `,
      [
        booking.bookingId,
        booking.roomId,
        booking.requesterId,
        booking.requesterName,
        booking.requesterEmail,
        booking.purpose,
        booking.attendeeCount,
        booking.date,
        booking.startTime,
        booking.endTime,
        booking.purposeDetail,
        booking.status,
        booking.reviewedBy,
        booking.reviewNote,
        booking.rejectionReason,
        booking.cancellationReason,
        booking.reservationId,
        booking.createdAt,
        booking.updatedAt
      ]
    );

    return mapBooking(result.rows[0]);
  }
}

function mapBooking(row: Record<string, unknown>): Booking {
  return {
    bookingId: String(row.booking_id),
    roomId: String(row.room_id),
    requesterId: String(row.requester_id),
    requesterName: String(row.requester_name),
    requesterEmail: String(row.requester_email),
    purpose: String(row.purpose),
    attendeeCount: Number(row.attendee_count),
    date: String(row.date),
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    purposeDetail: row.purpose_detail === null ? null : String(row.purpose_detail),
    status: row.status as Booking["status"],
    reviewedBy: row.reviewed_by === null ? null : String(row.reviewed_by),
    reviewNote: row.review_note === null ? null : String(row.review_note),
    rejectionReason: row.rejection_reason === null ? null : String(row.rejection_reason),
    cancellationReason:
      row.cancellation_reason === null ? null : String(row.cancellation_reason),
    reservationId: row.reservation_id === null ? null : String(row.reservation_id),
    createdAt: String(row.created_at),
    updatedAt: row.updated_at === null ? null : String(row.updated_at)
  };
}

export const bookingRepository = new BookingRepository();
