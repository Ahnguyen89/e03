import { Request, Response } from "express";

import { sendError } from "../http/errors";
import {
  validateListRoomsQuery,
  validateRoomId,
  validateRoomPayload
} from "../http/validation";
import { roomRepository } from "../repositories/roomRepository";

export async function listRoomsHandler(req: Request, res: Response): Promise<void> {
  const validation = validateListRoomsQuery(req);

  if (!validation.ok) {
    sendError(res, 400, validation.code, validation.message, validation.details);
    return;
  }

  try {
    const rooms = await roomRepository.list(validation.value);

    res.status(200).json({
      items: rooms,
      total: rooms.length
    });
  } catch (error) {
    sendError(res, 500, "DATABASE_ERROR", "Failed to list rooms", {
      message: error instanceof Error ? error.message : "Unknown database error"
    });
  }
}

export async function getRoomByIdHandler(req: Request, res: Response): Promise<void> {
  const validation = validateRoomId(String(req.params.roomId));

  if (!validation.ok) {
    sendError(res, 400, validation.code, validation.message);
    return;
  }

  const room = await roomRepository.findById(validation.value);

  if (!room) {
    sendError(res, 404, "ROOM_NOT_FOUND", "Room not found", {
      roomId: validation.value
    });
    return;
  }

  res.status(200).json(room);
}

export async function createRoomHandler(req: Request, res: Response): Promise<void> {
  const roomIdValidation = validateRoomId(String(req.body?.roomId ?? ""));
  if (!roomIdValidation.ok) {
    sendError(res, 400, roomIdValidation.code, "roomId is required");
    return;
  }

  const payloadValidation = validateRoomPayload(req.body);
  if (!payloadValidation.ok) {
    sendError(res, 400, payloadValidation.code, payloadValidation.message, payloadValidation.details);
    return;
  }

  if (await roomRepository.findById(roomIdValidation.value)) {
    sendError(res, 409, "ROOM_ALREADY_EXISTS", "roomId already exists", {
      roomId: roomIdValidation.value
    });
    return;
  }

  if (await roomRepository.existsByRoomCode(payloadValidation.value.roomCode)) {
    sendError(res, 409, "ROOM_CODE_ALREADY_EXISTS", "roomCode already exists", {
      roomCode: payloadValidation.value.roomCode
    });
    return;
  }

  const room = await roomRepository.create(roomIdValidation.value, payloadValidation.value);

  res.status(201).json(room);
}

export async function updateRoomHandler(req: Request, res: Response): Promise<void> {
  const roomIdValidation = validateRoomId(String(req.params.roomId));
  if (!roomIdValidation.ok) {
    sendError(res, 400, roomIdValidation.code, roomIdValidation.message);
    return;
  }

  const existingRoom = await roomRepository.findById(roomIdValidation.value);
  if (!existingRoom) {
    sendError(res, 404, "ROOM_NOT_FOUND", "Room not found", {
      roomId: roomIdValidation.value
    });
    return;
  }

  if (req.body?.roomId && req.body.roomId !== roomIdValidation.value) {
    sendError(res, 409, "ROOM_ID_MISMATCH", "roomId in body does not match path parameter", {
      pathRoomId: roomIdValidation.value,
      bodyRoomId: req.body.roomId
    });
    return;
  }

  const payloadValidation = validateRoomPayload(req.body);
  if (!payloadValidation.ok) {
    sendError(res, 400, payloadValidation.code, payloadValidation.message, payloadValidation.details);
    return;
  }

  if (
    await roomRepository.existsByRoomCode(payloadValidation.value.roomCode, roomIdValidation.value)
  ) {
    sendError(res, 409, "ROOM_CODE_ALREADY_EXISTS", "roomCode already exists", {
      roomCode: payloadValidation.value.roomCode
    });
    return;
  }

  const room = await roomRepository.update(roomIdValidation.value, payloadValidation.value);
  res.status(200).json(room);
}
