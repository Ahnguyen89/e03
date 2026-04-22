import { Request } from "express";

import { ListRoomsFilters, RoomPayload, RoomStatus } from "../models/room";

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

const roomStatuses: RoomStatus[] = ["active", "inactive"];

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parsePositiveInteger(raw: unknown, field: string): ValidationResult<number | undefined> {
  if (raw === undefined) {
    return { ok: true, value: undefined };
  }

  if (Array.isArray(raw)) {
    return {
      ok: false,
      code: "INVALID_QUERY",
      message: `${field} must be provided once`
    };
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return {
      ok: false,
      code: "INVALID_QUERY",
      message: `${field} must be a positive integer`
    };
  }

  return { ok: true, value: parsed };
}

function parseEquipmentQuery(raw: unknown): ValidationResult<string[] | undefined> {
  if (raw === undefined) {
    return { ok: true, value: undefined };
  }

  const values = Array.isArray(raw) ? raw : [raw];
  const normalized = values
    .map((item) => normalizeString(item))
    .filter((item): item is string => Boolean(item));

  if (normalized.length === 0) {
    return {
      ok: false,
      code: "INVALID_QUERY",
      message: "equipment must contain at least one non-empty value"
    };
  }

  return { ok: true, value: normalized };
}

function parseStatus(raw: unknown): ValidationResult<RoomStatus | undefined> {
  if (raw === undefined) {
    return { ok: true, value: undefined };
  }

  if (Array.isArray(raw)) {
    return {
      ok: false,
      code: "INVALID_QUERY",
      message: "status must be provided once"
    };
  }

  const status = normalizeString(raw);

  if (!status || !roomStatuses.includes(status as RoomStatus)) {
    return {
      ok: false,
      code: "INVALID_QUERY",
      message: "status must be one of: active, inactive"
    };
  }

  return { ok: true, value: status as RoomStatus };
}

export function validateListRoomsQuery(req: Request): ValidationResult<ListRoomsFilters> {
  const building = Array.isArray(req.query.building)
    ? undefined
    : normalizeString(req.query.building);

  if (req.query.building !== undefined && !building) {
    return {
      ok: false,
      code: "INVALID_QUERY",
      message: "building must be a non-empty string"
    };
  }

  const floorResult = parsePositiveInteger(req.query.floor, "floor");
  if (!floorResult.ok) {
    return floorResult;
  }

  const minCapacityResult = parsePositiveInteger(req.query.minCapacity, "minCapacity");
  if (!minCapacityResult.ok) {
    return minCapacityResult;
  }

  const equipmentResult = parseEquipmentQuery(req.query.equipment);
  if (!equipmentResult.ok) {
    return equipmentResult;
  }

  const statusResult = parseStatus(req.query.status);
  if (!statusResult.ok) {
    return statusResult;
  }

  return {
    ok: true,
    value: {
      building,
      floor: floorResult.value,
      minCapacity: minCapacityResult.value,
      equipment: equipmentResult.value,
      status: statusResult.value
    }
  };
}

export function validateRoomId(roomId: string): ValidationResult<string> {
  const normalized = normalizeString(roomId);

  if (!normalized) {
    return {
      ok: false,
      code: "INVALID_ROOM_ID",
      message: "roomId must be a non-empty string"
    };
  }

  return { ok: true, value: normalized };
}

export function validateRoomPayload(body: unknown): ValidationResult<RoomPayload> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "Request body must be a JSON object"
    };
  }

  const payload = body as Record<string, unknown>;
  const roomCode = normalizeString(payload.roomCode);
  const roomName = normalizeString(payload.roomName);
  const building = normalizeString(payload.building);
  const descriptionRaw = payload.description;
  const status = normalizeString(payload.status) as RoomStatus | undefined;

  if (!roomCode) {
    return { ok: false, code: "INVALID_BODY", message: "roomCode is required" };
  }

  if (!roomName) {
    return { ok: false, code: "INVALID_BODY", message: "roomName is required" };
  }

  if (!building) {
    return { ok: false, code: "INVALID_BODY", message: "building is required" };
  }

  if (!isPositiveInteger(payload.floor)) {
    return { ok: false, code: "INVALID_BODY", message: "floor must be a positive integer" };
  }

  if (!isPositiveInteger(payload.capacity)) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "capacity must be a positive integer"
    };
  }

  if (!status || !roomStatuses.includes(status)) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "status must be one of: active, inactive"
    };
  }

  if (!Array.isArray(payload.equipment)) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "equipment must be an array of strings"
    };
  }

  const equipment = payload.equipment
    .map((item) => normalizeString(item))
    .filter((item): item is string => Boolean(item));

  if (equipment.length !== payload.equipment.length) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "equipment must only contain non-empty strings"
    };
  }

  if (
    descriptionRaw !== undefined &&
    descriptionRaw !== null &&
    typeof descriptionRaw !== "string"
  ) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "description must be a string or null"
    };
  }

  return {
    ok: true,
    value: {
      roomCode,
      roomName,
      building,
      floor: payload.floor,
      capacity: payload.capacity,
      status,
      equipment,
      description: descriptionRaw === undefined ? null : descriptionRaw
    }
  };
}
