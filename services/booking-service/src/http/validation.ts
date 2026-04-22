import { Request } from "express";

import {
  BookingDecision,
  BookingFilters,
  BookingStatus,
  CancellationPayload,
  CancelledByRole,
  CreateBookingPayload,
  DecisionPayload
} from "../models/booking";

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

const bookingStatuses: BookingStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];
const bookingDecisions: BookingDecision[] = ["APPROVE", "REJECT"];
const cancelledByRoles: CancelledByRole[] = ["STUDENT", "ADMIN"];

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parsePositiveInteger(value: unknown, field: string): ValidationResult<number> {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: `${field} must be a positive integer`
    };
  }

  return { ok: true, value };
}

function validateDate(value: unknown, field: string): ValidationResult<string> {
  const normalized = normalizeString(value);

  if (!normalized || !datePattern.test(normalized)) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: `${field} must follow YYYY-MM-DD`
    };
  }

  return { ok: true, value: normalized };
}

function validateTime(value: unknown, field: string): ValidationResult<string> {
  const normalized = normalizeString(value);

  if (!normalized || !timePattern.test(normalized)) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: `${field} must follow HH:MM`
    };
  }

  return { ok: true, value: normalized };
}

function validateOptionalString(value: unknown): ValidationResult<string | null> {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== "string") {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "Optional field must be a string or null"
    };
  }

  return { ok: true, value };
}

export function validateBookingId(bookingId: string): ValidationResult<string> {
  const normalized = normalizeString(bookingId);

  if (!normalized) {
    return {
      ok: false,
      code: "INVALID_BOOKING_ID",
      message: "bookingId must be a non-empty string"
    };
  }

  return { ok: true, value: normalized };
}

export function validateCreateBookingBody(body: unknown): ValidationResult<CreateBookingPayload> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "Request body must be a JSON object"
    };
  }

  const payload = body as Record<string, unknown>;
  const roomId = normalizeString(payload.roomId);
  const requesterId = normalizeString(payload.requesterId);
  const requesterName = normalizeString(payload.requesterName);
  const requesterEmail = normalizeString(payload.requesterEmail);
  const purpose = normalizeString(payload.purpose);

  if (!roomId) {
    return { ok: false, code: "INVALID_BODY", message: "roomId is required" };
  }

  if (!requesterId) {
    return { ok: false, code: "INVALID_BODY", message: "requesterId is required" };
  }

  if (!requesterName) {
    return { ok: false, code: "INVALID_BODY", message: "requesterName is required" };
  }

  if (!requesterEmail || !emailPattern.test(requesterEmail)) {
    return { ok: false, code: "INVALID_BODY", message: "requesterEmail must be valid" };
  }

  if (!purpose) {
    return { ok: false, code: "INVALID_BODY", message: "purpose is required" };
  }

  const attendeeCountResult = parsePositiveInteger(payload.attendeeCount, "attendeeCount");
  if (!attendeeCountResult.ok) {
    return attendeeCountResult;
  }

  const dateResult = validateDate(payload.date, "date");
  if (!dateResult.ok) {
    return dateResult;
  }

  const startTimeResult = validateTime(payload.startTime, "startTime");
  if (!startTimeResult.ok) {
    return startTimeResult;
  }

  const endTimeResult = validateTime(payload.endTime, "endTime");
  if (!endTimeResult.ok) {
    return endTimeResult;
  }

  if (startTimeResult.value >= endTimeResult.value) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "startTime must be earlier than endTime"
    };
  }

  const purposeDetailResult = validateOptionalString(payload.purposeDetail);
  if (!purposeDetailResult.ok) {
    return purposeDetailResult;
  }

  return {
    ok: true,
    value: {
      roomId,
      requesterId,
      requesterName,
      requesterEmail,
      purpose,
      attendeeCount: attendeeCountResult.value,
      date: dateResult.value,
      startTime: startTimeResult.value,
      endTime: endTimeResult.value,
      purposeDetail: purposeDetailResult.value
    }
  };
}

export function validateDecisionBody(body: unknown): ValidationResult<DecisionPayload> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "Request body must be a JSON object"
    };
  }

  const payload = body as Record<string, unknown>;
  const decision = normalizeString(payload.decision) as BookingDecision | undefined;
  const reviewedBy = normalizeString(payload.reviewedBy);

  if (!decision || !bookingDecisions.includes(decision)) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "decision must be APPROVE or REJECT"
    };
  }

  if (!reviewedBy) {
    return { ok: false, code: "INVALID_BODY", message: "reviewedBy is required" };
  }

  const reviewNoteResult = validateOptionalString(payload.reviewNote);
  if (!reviewNoteResult.ok) {
    return reviewNoteResult;
  }

  const rejectionReasonResult = validateOptionalString(payload.rejectionReason);
  if (!rejectionReasonResult.ok) {
    return rejectionReasonResult;
  }

  return {
    ok: true,
    value: {
      decision,
      reviewedBy,
      reviewNote: reviewNoteResult.value,
      rejectionReason: rejectionReasonResult.value
    }
  };
}

export function validateCancellationBody(body: unknown): ValidationResult<CancellationPayload> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "Request body must be a JSON object"
    };
  }

  const payload = body as Record<string, unknown>;
  const cancelledBy = normalizeString(payload.cancelledBy);
  const cancelledByRole = normalizeString(payload.cancelledByRole) as CancelledByRole | undefined;

  if (!cancelledBy) {
    return { ok: false, code: "INVALID_BODY", message: "cancelledBy is required" };
  }

  if (!cancelledByRole || !cancelledByRoles.includes(cancelledByRole)) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "cancelledByRole must be STUDENT or ADMIN"
    };
  }

  const cancellationReasonResult = validateOptionalString(payload.cancellationReason);
  if (!cancellationReasonResult.ok) {
    return cancellationReasonResult;
  }

  return {
    ok: true,
    value: {
      cancelledBy,
      cancelledByRole,
      cancellationReason: cancellationReasonResult.value
    }
  };
}

function parseQueryString(raw: unknown): ValidationResult<string | undefined> {
  if (raw === undefined) {
    return { ok: true, value: undefined };
  }

  if (Array.isArray(raw)) {
    return {
      ok: false,
      code: "INVALID_QUERY",
      message: "Query parameter must be provided once"
    };
  }

  const value = normalizeString(raw);
  if (!value) {
    return {
      ok: false,
      code: "INVALID_QUERY",
      message: "Query parameter must be a non-empty string"
    };
  }

  return { ok: true, value };
}

export function validateListBookingsQuery(req: Request): ValidationResult<BookingFilters> {
  const statusResult = parseQueryString(req.query.status);
  if (!statusResult.ok) {
    return statusResult;
  }

  const dateResult = parseQueryString(req.query.date);
  if (!dateResult.ok) {
    return dateResult;
  }

  const requesterIdResult = parseQueryString(req.query.requesterId);
  if (!requesterIdResult.ok) {
    return requesterIdResult;
  }

  const requesterEmailResult = parseQueryString(req.query.requesterEmail);
  if (!requesterEmailResult.ok) {
    return requesterEmailResult;
  }

  const roomIdResult = parseQueryString(req.query.roomId);
  if (!roomIdResult.ok) {
    return roomIdResult;
  }

  const status = statusResult.value as BookingStatus | undefined;

  if (status && !bookingStatuses.includes(status)) {
    return {
      ok: false,
      code: "INVALID_QUERY",
      message: "status must be one of: PENDING, APPROVED, REJECTED, CANCELLED"
    };
  }

  if (dateResult.value && !datePattern.test(dateResult.value)) {
    return {
      ok: false,
      code: "INVALID_QUERY",
      message: "date must follow YYYY-MM-DD"
    };
  }

  if (requesterEmailResult.value && !emailPattern.test(requesterEmailResult.value)) {
    return {
      ok: false,
      code: "INVALID_QUERY",
      message: "requesterEmail must be valid"
    };
  }

  return {
    ok: true,
    value: {
      status,
      date: dateResult.value,
      requesterId: requesterIdResult.value,
      requesterEmail: requesterEmailResult.value,
      roomId: roomIdResult.value
    }
  };
}
