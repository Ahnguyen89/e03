import { randomUUID } from "crypto";
import { Request, Response } from "express";

import { checkRoom } from "../clients/roomClient";
import {
  checkAvailability,
  createReservation,
  releaseReservation
} from "../clients/scheduleClient";
import { sendError } from "../http/errors";
import {
  validateBookingId,
  validateCancellationBody,
  validateCreateBookingBody,
  validateDecisionBody,
  validateListBookingsQuery
} from "../http/validation";
import { Booking } from "../models/booking";
import { bookingRepository } from "../repositories/bookingRepository";

export async function listBookingsHandler(req: Request, res: Response): Promise<void> {
  const validation = validateListBookingsQuery(req);

  if (!validation.ok) {
    sendError(res, 400, validation.code, validation.message, validation.details);
    return;
  }

  const items = await bookingRepository.list(validation.value);
  res.status(200).json({ items, total: items.length });
}

export async function getBookingByIdHandler(req: Request, res: Response): Promise<void> {
  const validation = validateBookingId(String(req.params.bookingId));

  if (!validation.ok) {
    sendError(res, 400, validation.code, validation.message);
    return;
  }

  const booking = await bookingRepository.findById(validation.value);

  if (!booking) {
    sendError(res, 404, "BOOKING_NOT_FOUND", "Booking not found", {
      bookingId: validation.value
    });
    return;
  }

  res.status(200).json(booking);
}

export async function createBookingHandler(req: Request, res: Response): Promise<void> {
  const validation = validateCreateBookingBody(req.body);

  if (!validation.ok) {
    sendError(res, 400, validation.code, validation.message, validation.details);
    return;
  }

  try {
    const roomCheck = await checkRoom(validation.value.roomId);

    if (!roomCheck.found) {
      sendError(res, 404, "ROOM_NOT_FOUND", "Referenced room does not exist", {
        roomId: validation.value.roomId
      });
      return;
    }

    if (!roomCheck.active) {
      sendError(res, 404, "ROOM_NOT_ACTIVE", "Referenced room is not active", {
        roomId: validation.value.roomId
      });
      return;
    }

    const availability = await checkAvailability({
      roomId: validation.value.roomId,
      date: validation.value.date,
      startTime: validation.value.startTime,
      endTime: validation.value.endTime
    });

    if (!availability.available) {
      sendError(
        res,
        409,
        "SLOT_UNAVAILABLE",
        availability.reason ?? "Requested time slot is not available"
      );
      return;
    }

    const booking = await bookingRepository.create(randomUUID(), validation.value);
    res.status(201).json(booking);
  } catch (error) {
    sendError(res, 502, "DEPENDENCY_ERROR", "Failed to validate booking against dependent services", {
      message: error instanceof Error ? error.message : "Unknown dependency error"
    });
  }
}

export async function decideBookingHandler(req: Request, res: Response): Promise<void> {
  const bookingIdValidation = validateBookingId(String(req.params.bookingId));
  if (!bookingIdValidation.ok) {
    sendError(res, 400, bookingIdValidation.code, bookingIdValidation.message);
    return;
  }

  const decisionValidation = validateDecisionBody(req.body);
  if (!decisionValidation.ok) {
    sendError(res, 400, decisionValidation.code, decisionValidation.message, decisionValidation.details);
    return;
  }

  const booking = await bookingRepository.findById(bookingIdValidation.value);
  if (!booking) {
    sendError(res, 404, "BOOKING_NOT_FOUND", "Booking not found", {
      bookingId: bookingIdValidation.value
    });
    return;
  }

  if (booking.status !== "PENDING") {
    sendError(res, 409, "INVALID_TRANSITION", "Only PENDING bookings can be decided", {
      bookingId: booking.bookingId,
      currentStatus: booking.status
    });
    return;
  }

  if (decisionValidation.value.decision === "REJECT") {
    const updated: Booking = {
      ...booking,
      status: "REJECTED",
      reviewedBy: decisionValidation.value.reviewedBy,
      reviewNote: decisionValidation.value.reviewNote,
      rejectionReason: decisionValidation.value.rejectionReason,
      updatedAt: new Date().toISOString()
    };

    const saved = await bookingRepository.save(updated);
    res.status(200).json(saved);
    return;
  }

  try {
    const reservation = await createReservation({
      bookingId: booking.bookingId,
      roomId: booking.roomId,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime
    });

    const updated: Booking = {
      ...booking,
      status: "APPROVED",
      reviewedBy: decisionValidation.value.reviewedBy,
      reviewNote: decisionValidation.value.reviewNote,
      rejectionReason: null,
      reservationId: reservation.reservationId,
      updatedAt: new Date().toISOString()
    };

    const saved = await bookingRepository.save(updated);
    res.status(200).json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown reservation error";

    if (message.startsWith("CONFLICT:")) {
      sendError(res, 409, "RESERVATION_CONFLICT", message.replace("CONFLICT:", ""));
      return;
    }

    sendError(res, 502, "DEPENDENCY_ERROR", "Failed to reserve slot in schedule-service", {
      message
    });
  }
}

export async function cancelBookingHandler(req: Request, res: Response): Promise<void> {
  const bookingIdValidation = validateBookingId(String(req.params.bookingId));
  if (!bookingIdValidation.ok) {
    sendError(res, 400, bookingIdValidation.code, bookingIdValidation.message);
    return;
  }

  const cancellationValidation = validateCancellationBody(req.body);
  if (!cancellationValidation.ok) {
    sendError(
      res,
      400,
      cancellationValidation.code,
      cancellationValidation.message,
      cancellationValidation.details
    );
    return;
  }

  const booking = await bookingRepository.findById(bookingIdValidation.value);
  if (!booking) {
    sendError(res, 404, "BOOKING_NOT_FOUND", "Booking not found", {
      bookingId: bookingIdValidation.value
    });
    return;
  }

  const actor = cancellationValidation.value;

  if (booking.status === "REJECTED" || booking.status === "CANCELLED") {
    sendError(res, 409, "INVALID_TRANSITION", "Booking is already in a terminal state", {
      bookingId: booking.bookingId,
      currentStatus: booking.status
    });
    return;
  }

  if (actor.cancelledByRole === "STUDENT") {
    if (actor.cancelledBy !== booking.requesterId || booking.status !== "PENDING") {
      sendError(
        res,
        409,
        "CANCELLATION_NOT_ALLOWED",
        "Student may only cancel their own PENDING booking"
      );
      return;
    }
  }

  if (actor.cancelledByRole === "ADMIN" && !["PENDING", "APPROVED"].includes(booking.status)) {
    sendError(
      res,
      409,
      "CANCELLATION_NOT_ALLOWED",
      "Admin may only cancel PENDING or APPROVED bookings"
    );
    return;
  }

  if (booking.status === "APPROVED") {
    if (!booking.reservationId) {
      sendError(res, 409, "MISSING_RESERVATION_ID", "Approved booking is missing reservationId");
      return;
    }

    try {
      await releaseReservation(booking.reservationId);
    } catch (error) {
      sendError(res, 409, "RELEASE_FAILED", "Failed to release reserved slot", {
        message: error instanceof Error ? error.message : "Unknown release error"
      });
      return;
    }
  }

  const updated: Booking = {
    ...booking,
    status: "CANCELLED",
    cancellationReason: actor.cancellationReason,
    updatedAt: new Date().toISOString()
  };

  const saved = await bookingRepository.save(updated);
  res.status(200).json(saved);
}
