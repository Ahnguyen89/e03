import { Booking, BookingFilters, CreateBookingPayload } from "../models/booking";

class BookingRepository {
  private readonly bookings = new Map<string, Booking>();

  list(filters: BookingFilters): Booking[] {
    return Array.from(this.bookings.values()).filter((booking) => {
      if (filters.status && booking.status !== filters.status) {
        return false;
      }

      if (filters.date && booking.date !== filters.date) {
        return false;
      }

      if (filters.requesterId && booking.requesterId !== filters.requesterId) {
        return false;
      }

      if (
        filters.requesterEmail &&
        booking.requesterEmail.toLowerCase() !== filters.requesterEmail.toLowerCase()
      ) {
        return false;
      }

      if (filters.roomId && booking.roomId !== filters.roomId) {
        return false;
      }

      return true;
    });
  }

  findById(bookingId: string): Booking | undefined {
    return this.bookings.get(bookingId);
  }

  create(bookingId: string, payload: CreateBookingPayload): Booking {
    const now = new Date().toISOString();
    const booking: Booking = {
      bookingId,
      ...payload,
      status: "PENDING",
      reviewedBy: null,
      reviewNote: null,
      rejectionReason: null,
      cancellationReason: null,
      reservationId: null,
      createdAt: now,
      updatedAt: null
    };

    this.bookings.set(booking.bookingId, booking);
    return booking;
  }

  save(booking: Booking): Booking {
    this.bookings.set(booking.bookingId, booking);
    return booking;
  }
}

export const bookingRepository = new BookingRepository();
