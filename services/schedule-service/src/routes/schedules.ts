import { Request, Response } from "express";

import { sendError } from "../http/errors";
import {
  validateAvailabilityQuery,
  validateCreateReservationBody,
  validateReservationId
} from "../http/validation";
import { reservationRepository } from "../repositories/reservationRepository";

export function checkAvailabilityHandler(req: Request, res: Response): void {
  const validation = validateAvailabilityQuery(req);

  if (!validation.ok) {
    sendError(res, 400, validation.code, validation.message, validation.details);
    return;
  }

  const conflict = reservationRepository.hasConflict(validation.value);

  res.status(200).json({
    roomId: validation.value.roomId,
    date: validation.value.date,
    startTime: validation.value.startTime,
    endTime: validation.value.endTime,
    available: !conflict,
    reason: conflict ? "Requested time slot overlaps with an existing reservation" : null
  });
}

export function createReservationHandler(req: Request, res: Response): void {
  const validation = validateCreateReservationBody(req.body);

  if (!validation.ok) {
    sendError(res, 400, validation.code, validation.message, validation.details);
    return;
  }

  if (reservationRepository.hasConflict(validation.value)) {
    sendError(res, 409, "SLOT_CONFLICT", "Requested time slot is no longer available");
    return;
  }

  const reservation = reservationRepository.create(validation.value);
  res.status(201).json(reservation);
}

export function releaseReservationHandler(req: Request, res: Response): void {
  const validation = validateReservationId(req.params.reservationId);

  if (!validation.ok) {
    sendError(res, 400, validation.code, validation.message, validation.details);
    return;
  }

  const reservation = reservationRepository.findById(validation.value);

  if (!reservation) {
    sendError(res, 404, "RESERVATION_NOT_FOUND", "Reservation not found", {
      reservationId: validation.value
    });
    return;
  }

  if (reservation.status !== "RESERVED") {
    sendError(
      res,
      409,
      "INVALID_RESERVATION_STATE",
      "Reservation is not in releasable state",
      {
        reservationId: validation.value,
        currentStatus: reservation.status
      }
    );
    return;
  }

  reservationRepository.release(validation.value);
  res.status(204).send();
}
