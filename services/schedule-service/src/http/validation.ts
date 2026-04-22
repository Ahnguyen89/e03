import { Request } from "express";

import { CreateReservationPayload, ScheduleSlotInput } from "../models/reservation";

interface ValidationSuccess<T> {
  ok: true;
  value: T;
}

interface ValidationFailure {
  ok: false;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseRequiredString(value: unknown, field: string): ValidationResult<string> {
  const normalized = normalizeString(value);

  if (!normalized) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: `${field} is required`
    };
  }

  return { ok: true, value: normalized };
}

function parseDate(value: unknown, field: string): ValidationResult<string> {
  const result = parseRequiredString(value, field);
  if (!result.ok) {
    return result;
  }

  if (!datePattern.test(result.value)) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: `${field} must follow YYYY-MM-DD`
    };
  }

  return result;
}

function parseTime(value: unknown, field: string): ValidationResult<string> {
  const result = parseRequiredString(value, field);
  if (!result.ok) {
    return result;
  }

  if (!timePattern.test(result.value)) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: `${field} must follow HH:MM`
    };
  }

  return result;
}

function validateSlotValues(slot: ScheduleSlotInput): ValidationResult<ScheduleSlotInput> {
  if (slot.startTime >= slot.endTime) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "startTime must be earlier than endTime"
    };
  }

  return { ok: true, value: slot };
}

export function validateAvailabilityQuery(req: Request): ValidationResult<ScheduleSlotInput> {
  const roomIdResult = parseRequiredString(req.query.roomId, "roomId");
  if (!roomIdResult.ok) {
    return roomIdResult;
  }

  const dateResult = parseDate(req.query.date, "date");
  if (!dateResult.ok) {
    return dateResult;
  }

  const startTimeResult = parseTime(req.query.startTime, "startTime");
  if (!startTimeResult.ok) {
    return startTimeResult;
  }

  const endTimeResult = parseTime(req.query.endTime, "endTime");
  if (!endTimeResult.ok) {
    return endTimeResult;
  }

  return validateSlotValues({
    roomId: roomIdResult.value,
    date: dateResult.value,
    startTime: startTimeResult.value,
    endTime: endTimeResult.value
  });
}

export function validateCreateReservationBody(
  body: unknown
): ValidationResult<CreateReservationPayload> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Request body must be a JSON object"
    };
  }

  const payload = body as Record<string, unknown>;

  const bookingIdResult = parseRequiredString(payload.bookingId, "bookingId");
  if (!bookingIdResult.ok) {
    return bookingIdResult;
  }

  const roomIdResult = parseRequiredString(payload.roomId, "roomId");
  if (!roomIdResult.ok) {
    return roomIdResult;
  }

  const dateResult = parseDate(payload.date, "date");
  if (!dateResult.ok) {
    return dateResult;
  }

  const startTimeResult = parseTime(payload.startTime, "startTime");
  if (!startTimeResult.ok) {
    return startTimeResult;
  }

  const endTimeResult = parseTime(payload.endTime, "endTime");
  if (!endTimeResult.ok) {
    return endTimeResult;
  }

  const slotValidation = validateSlotValues({
    roomId: roomIdResult.value,
    date: dateResult.value,
    startTime: startTimeResult.value,
    endTime: endTimeResult.value
  });
  if (!slotValidation.ok) {
    return slotValidation;
  }

  return {
    ok: true,
    value: {
      bookingId: bookingIdResult.value,
      ...slotValidation.value
    }
  };
}

export function validateReservationId(reservationId: string): ValidationResult<string> {
  const normalized = normalizeString(reservationId);

  if (!normalized) {
    return {
      ok: false,
      code: "INVALID_RESERVATION_ID",
      message: "reservationId is required"
    };
  }

  return { ok: true, value: normalized };
}
